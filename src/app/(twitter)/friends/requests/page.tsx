"use client";

import { FaInbox, FaPaperPlane } from "react-icons/fa";
import { useContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import User from "@/components/user/User";

import { AuthContext } from "@/app/(twitter)/layout";
import CircularLoading from "@/components/misc/CircularLoading";
import { UserProps } from "@/types/UserProps";
import { getUser, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } from "@/utilities/fetch";

type TabType = 'incoming' | 'outgoing';

export default function FriendRequestsPage() {
  const { token, isPending, refreshToken } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user", token?.username, "friends"],
    queryFn: () => token && getUser(token.username),
    enabled: !!token,
  });

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

  if (isPending || !token || isLoading) return <CircularLoading />;

  const incoming = (data?.pendingIncoming || []) as UserProps[];
  const outgoing = (data?.pendingOutgoing || []) as UserProps[];

  return (
    <main className="requests-page">
      <h1 className="page-name">Friend Requests</h1>

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
    </main>
  );
}
