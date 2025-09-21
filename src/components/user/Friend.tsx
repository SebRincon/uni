import { useContext, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AuthContext } from "@/app/(twitter)/auth-context";
import { UserProps } from "@/types/UserProps";
import CustomSnackbar from "../misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";
import { 
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend
} from "@/utilities/fetch";

export default function Friend({ profile }: { profile: UserProps }) {
    const [isHovered, setIsHovered] = useState(false);
    const [relation, setRelation] = useState<
      'none' | 'friends' | 'incoming' | 'outgoing'
    >('none');
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const { token, isPending, refreshToken } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const queryKey = ["users", profile.username];

    useEffect(() => {
        if (!isPending && token) {
            const isFriend = token.friends?.some(u => u.id === profile.id);
            const isIncoming = token.pendingIncoming?.some(u => u.id === profile.id);
            const isOutgoing = token.pendingOutgoing?.some(u => u.id === profile.id);
            if (isFriend) setRelation('friends');
            else if (isIncoming) setRelation('incoming');
            else if (isOutgoing) setRelation('outgoing');
            else setRelation('none');
        } else if (!isPending) {
            setRelation('none');
        }
    }, [isPending, token, profile.id]);

    useEffect(() => {
        const timer = setTimeout(() => setIsButtonDisabled(false), 1200);
        return () => clearTimeout(timer);
    }, [isButtonDisabled]);

    const commonOnSuccess = () => {
        queryClient.invalidateQueries({ queryKey });
        if (refreshToken) refreshToken();
        setIsButtonDisabled(false);
    };

    const sendReqMutation = useMutation({
        mutationFn: (requesterId: string) => sendFriendRequest(requesterId, profile.id),
        onMutate: async () => {
            setIsButtonDisabled(true);
            setRelation('outgoing');
            await queryClient.cancelQueries({ queryKey });
        },
        onSuccess: commonOnSuccess,
    });

    const cancelReqMutation = useMutation({
        mutationFn: (requesterId: string) => cancelFriendRequest(requesterId, profile.id),
        onMutate: async () => {
            setIsButtonDisabled(true);
            setRelation('none');
            await queryClient.cancelQueries({ queryKey });
        },
        onSuccess: commonOnSuccess,
    });

    const acceptReqMutation = useMutation({
        mutationFn: (userId: string) => acceptFriendRequest(userId, profile.id),
        onMutate: async () => {
            setIsButtonDisabled(true);
            setRelation('friends');
            await queryClient.cancelQueries({ queryKey });
        },
        onSuccess: commonOnSuccess,
    });

    const declineReqMutation = useMutation({
        mutationFn: (userId: string) => declineFriendRequest(userId, profile.id),
        onMutate: async () => {
            setIsButtonDisabled(true);
            setRelation('none');
            await queryClient.cancelQueries({ queryKey });
        },
        onSuccess: commonOnSuccess,
    });

    const unfriendMutation = useMutation({
        mutationFn: (userId: string) => removeFriend(userId, profile.id),
        onMutate: async () => {
            setIsButtonDisabled(true);
            setRelation('none');
            await queryClient.cancelQueries({ queryKey });
        },
        onSuccess: commonOnSuccess,
    });

    const requireAuth = () => {
        if (!token) {
            setSnackbar({ message: "You need to login first to manage friends.", severity: "info", open: true });
            return true;
        }
        return false;
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    const handlePrimaryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (requireAuth()) return;
        const me = token!.id;
        if (relation === 'none') sendReqMutation.mutate(me);
        else if (relation === 'friends') unfriendMutation.mutate(me);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (requireAuth()) return;
        const me = token!.id;
        cancelReqMutation.mutate(me);
    };

    const handleAccept = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (requireAuth()) return;
        const me = token!.id;
        acceptReqMutation.mutate(me);
    };

    const handleDecline = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (requireAuth()) return;
        const me = token!.id;
        declineReqMutation.mutate(me);
    };

    let buttonContent: React.ReactNode;

    switch (relation) {
        case 'friends':
            buttonContent = (
                <button 
                    onClick={handlePrimaryClick} 
                    className="btn btn-white"
                    disabled={isButtonDisabled}
                >
                    Friends
                </button>
            );
            break;
        case 'outgoing':
            buttonContent = (
                <button 
                    onClick={handleCancel} 
                    className={isHovered ? "btn btn-danger-outline" : "btn btn-white"}
                    disabled={isButtonDisabled}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {isHovered ? 'Cancel' : 'Requested'}
                </button>
            );
            break;
        case 'incoming':
            buttonContent = (
                <>
                    <button onClick={handleAccept} className="btn btn-dark" disabled={isButtonDisabled}>
                        Accept
                    </button>
                    <button onClick={handleDecline} className="btn btn-danger-outline" disabled={isButtonDisabled}>
                        Decline
                    </button>
                </>
            );
            break;
        default:
            buttonContent = (
                <button onClick={handlePrimaryClick} className="btn btn-dark" disabled={isButtonDisabled}>
                    Add Friend
                </button>
            );
            break;
    }

    return (
        <>
            <div className="friend-actions">
                {buttonContent}
            </div>
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </>
    );
}
