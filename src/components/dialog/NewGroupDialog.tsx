import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FaSearch, FaTimes, FaPlus } from "react-icons/fa";

import { NewMessageDialogProps } from "@/types/DialogProps";
import CircularLoading from "../misc/CircularLoading";
import { createConversation, search } from "@/utilities/fetch";
import { getUser } from "@/utilities/fetch";
import User from "../user/User";
import { UserProps } from "@/types/UserProps";

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export default function NewGroupDialog({ open, handleNewMessageClose, token }: NewMessageDialogProps) {
  const [name, setName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserProps[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProps[]>([]);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user", token.username, "friends"],
    queryFn: () => getUser(token.username),
    enabled: open,
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
        // Filter out already selected users and current user
        const filteredUsers = (results.users || []).filter((user: UserProps) => 
          user.username !== token.username && 
          !selectedUsers.some(selected => selected.id === user.username)
        );
        setSearchResults(filteredUsers);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [selectedUsers, token.username]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowSearchDropdown(true);
    debouncedSearch(query);
  };

  // Add user to selection
  const handleAddUser = (user: UserProps) => {
    if (!selectedUsers.some(selected => selected.id === user.username)) {
      setSelectedUsers(prev => [...prev, { ...user, id: user.username }]);
      setSearchQuery("");
      setShowSearchDropdown(false);
      setSearchResults([]);
    }
  };

  // Remove user from selection
  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  useEffect(() => {
    if (!open) {
      setName("");
      setSelectedUsers([]);
      setSearchQuery("");
      setShowSearchDropdown(false);
      setSearchResults([]);
    }
  }, [open]);

  // Handle search input focus
  const handleSearchFocus = () => {
    if (searchQuery.length >= 2) {
      setShowSearchDropdown(true);
    }
  };

  // Handle search input blur with delay
  const handleSearchBlur = () => {
    setTimeout(() => setShowSearchDropdown(false), 150);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const members = selectedUsers.map(user => user.id);
      if (members.length === 0) throw new Error("Select at least one person");
      if (members.length > 4) throw new Error("Max 4 people (5 total participants)");
      const convName = name && name.trim().length > 0
        ? name.trim()
        : selectedUsers.map(user => user.name || user.username).join(", ");
      return createConversation(token.id, members, convName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", token.username] });
      handleNewMessageClose();
    }
  });

  if (!open) return null;

  return (
    <Dialog className="dialog new-group-dialog" open={open} onClose={handleNewMessageClose} fullWidth maxWidth="xs">
      <DialogTitle className="title">New Group</DialogTitle>
      <DialogContent>
        {/* Group Name Input */}
        <div className="input-section">
          <TextField
            fullWidth
            placeholder="Group name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="selected-users-section">
            <h4>Selected People ({selectedUsers.length}/4):</h4>
            <div className="selected-users-list">
              {selectedUsers.map(user => (
                <div key={user.id} className="selected-user-item">
                  <div className="user-info">
                    <img src={user.photoUrl || '/default-avatar.png'} alt={user.username} className="user-avatar" />
                    <span className="user-name">{user.name || user.username}</span>
                    <span className="user-username">@{user.username}</span>
                  </div>
                  <button 
                    className="remove-user-btn"
                    onClick={() => handleRemoveUser(user.id)}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add People Section */}
        <div className="add-people-section">
          <div className="section-header">
            <h4>Add People</h4>
            <span className="section-subtitle">Search and add up to 4 people to your group</span>
          </div>
          
          <div className="search-container">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                className="search-input"
              />
            </div>
            
            {/* Search Dropdown */}
            {showSearchDropdown && (
              <div className="search-dropdown">
                {isSearching ? (
                  <div className="search-loading">
                    <CircularLoading />
                    <span>Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <div 
                      key={user.username} 
                      className="search-result-item"
                      onClick={() => handleAddUser(user)}
                    >
                      <img src={user.photoUrl || '/default-avatar.png'} alt={user.username} className="result-avatar" />
                      <div className="result-info">
                        <span className="result-name">{user.name || user.username}</span>
                        <span className="result-username">@{user.username}</span>
                      </div>
                      <FaPlus className="add-icon" />
                    </div>
                  ))
                ) : searchQuery.length >= 2 ? (
                  <div className="no-results">No users found</div>
                ) : (
                  <div className="search-placeholder">Type at least 2 characters to search</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn btn-light" 
            onClick={handleNewMessageClose}
          >
            Cancel
          </button>
          <button 
            className="btn btn-dark" 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isLoading || selectedUsers.length === 0}
          >
            {mutation.isLoading ? "Creating..." : `Create Group (${selectedUsers.length})`}
          </button>
        </div>
        
        {mutation.error && (
          <div className="error-message">
            {(mutation.error as Error).message}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
