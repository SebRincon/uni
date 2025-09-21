"use client";

import { FaInbox, FaPaperPlane, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
import { useContext, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import User from "@/components/user/User";

import { AuthContext } from "@/app/(twitter)/auth-context";
import { UserProps } from "@/types/UserProps";
import { getUser, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, search, sendFriendRequest } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";

type TabType = 'incoming' | 'outgoing';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export default function FriendRequestsPage() {
  const { token, isPending, refreshToken } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProps[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserProps[]>([]);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user", token?.username, "friends"],
    queryFn: () => token && getUser(token.username),
    enabled: !!token,
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      try {
        setIsSearching(true);
        const results = await search(query);
        // Filter out current user, already selected users, and existing friends/pending requests
        const currentUser = data;
        const filteredUsers = (results.users || []).filter((user: UserProps) => {
          const isCurrentUser = user.username === token?.username;
          const isAlreadySelected = selectedUsers.some(selected => selected.username === user.username);
          const isFriend = currentUser?.friends?.some((friend: UserProps) => friend.username === user.username);
          const isPendingIncoming = currentUser?.pendingIncoming?.some((pending: UserProps) => pending.username === user.username);
          const isPendingOutgoing = currentUser?.pendingOutgoing?.some((pending: UserProps) => pending.username === user.username);
          
          return !isCurrentUser && !isAlreadySelected && !isFriend && !isPendingIncoming && !isPendingOutgoing;
        });
        setSearchResults(filteredUsers);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [selectedUsers, token?.username, data]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Add user to selection
  const handleSelectUser = (user: UserProps) => {
    if (!selectedUsers.some(selected => selected.username === user.username)) {
      setSelectedUsers(prev => [...prev, { ...user, id: user.username }]);
      // Remove from search results to prevent re-selection
      setSearchResults(prev => prev.filter(result => result.username !== user.username));
    }
  };

  // Remove user from selection
  const handleDeselectUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsSearchModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
  };

  const commonOnSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    if (refreshToken) refreshToken();
  };

  const acceptMutation = useMutation({
    mutationFn: (otherId: string) => acceptFriendRequest(token!.id, otherId),
    onSuccess: commonOnSuccess,
  });
  const declineMutation = useMutation({
    mutationFn: (otherId: string) => declineFriendRequest(token!.id, otherId),
    onSuccess: commonOnSuccess,
  });
  const cancelMutation = useMutation({
    mutationFn: (otherId: string) => cancelFriendRequest(token!.id, otherId),
    onSuccess: commonOnSuccess,
  });

  const sendFriendRequestsMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      // Send multiple friend requests
      const promises = userIds.map(userId => sendFriendRequest(token!.id, userId));
      return Promise.all(promises);
    },
    onSuccess: () => {
      commonOnSuccess();
      handleModalClose();
    },
  });

  if (isPending || !token || isLoading) return <CircularLoading />;

  const incoming = (data?.pendingIncoming || []) as UserProps[];
  const outgoing = (data?.pendingOutgoing || []) as UserProps[];

  return (
    <main className="requests-page">
      <div className="requests-header">
        <h1 className="page-name">Friend Requests</h1>
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="btn btn-white icon-hoverable add-friend-button"
        >
          <FaPlus />
        </button>
      </div>

      <div className="request-toggle">
        <button 
          className={`toggle-btn ${activeTab === 'incoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          <FaInbox /> Incoming
        </button>
        <button 
          className={`toggle-btn ${activeTab === 'outgoing' ? 'active' : ''}`}
          onClick={() => setActiveTab('outgoing')}
        >
          <FaPaperPlane /> Outgoing
        </button>
      </div>

      {activeTab === 'incoming' && (
        <section className="request-section">
          {incoming.length === 0 ? (
              <div className="empty-requests">
                  <FaInbox size={48} />
                  <h3>No incoming requests</h3>
                  <p className="text-muted">When someone sends you a friend request, it will appear here.</p>
              </div>
          ) : (
              <div className="request-list">
                {incoming.map(u => (
                  <div key={u.id} className="request-card">
                    <User user={u} showFriendButton={false} />
                    <div className="button-group">
                      <button className="btn btn-dark" onClick={() => acceptMutation.mutate(u.id)}>Accept</button>
                      <button className="btn btn-danger-outline" onClick={() => declineMutation.mutate(u.id)}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
          )}
        </section>
      )}

      {activeTab === 'outgoing' && (
        <section className="request-section">
          {outgoing.length === 0 ? (
              <div className="empty-requests">
                  <FaPaperPlane size={48} />
                  <h3>No outgoing requests</h3>
                  <p className="text-muted">Requests you send to other people will appear here.</p>
              </div>
          ) : (
              <div className="request-list">
                {outgoing.map(u => (
                  <div key={u.id} className="request-card">
                    <User user={u} showFriendButton={false} />
                    <div className="button-group">
                      <button className="btn btn-danger-outline" onClick={() => cancelMutation.mutate(u.id)}>Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
          )}
        </section>
      )}
      
      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="search-friends-modal-overlay" onClick={handleModalClose}>
          <div className="search-friends-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Friend Requests</h2>
              <button className="close-btn" onClick={handleModalClose}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-content">
              {/* Search Input */}
              <div className="search-section">
                <div className="search-input-wrapper">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search users by name or username..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="search-input"
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="selected-section">
                  <h3>Selected Users ({selectedUsers.length}):</h3>
                  <div className="selected-users">
                    {selectedUsers.map(user => (
                      <div key={user.id} className="selected-user">
                        <div className="user-info">
                          <span className="user-name">{user.name || user.username}</span>
                          <span className="user-username">@{user.username}</span>
                        </div>
                        <button 
                          className="remove-btn"
                          onClick={() => handleDeselectUser(user.id)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Search Results */}
              <div className="results-section">
                {isSearching ? (
                  <div className="loading-state">
                    <CircularLoading />
                    <span>Searching users...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="search-results">
                    <h3>Search Results:</h3>
                    {searchResults.map(user => (
                      <div 
                        key={user.username} 
                        className="result-item"
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="user-info">
                          <span className="user-name">{user.name || user.username}</span>
                          <span className="user-username">@{user.username}</span>
                        </div>
                        <FaPlus className="add-icon" />
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="no-results">No users found</div>
                ) : (
                  <div className="search-hint">Type at least 2 characters to search for users</div>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="btn btn-light" onClick={handleModalClose}>
                Cancel
              </button>
              <button 
                className="btn btn-dark" 
                onClick={() => sendFriendRequestsMutation.mutate(selectedUsers.map(u => u.id))}
                disabled={sendFriendRequestsMutation.isLoading || selectedUsers.length === 0}
              >
                {sendFriendRequestsMutation.isLoading 
                  ? "Sending..." 
                  : `Send Requests (${selectedUsers.length})`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
