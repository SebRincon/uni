import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, TextField, FormControlLabel, Checkbox } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { NewMessageDialogProps } from "@/types/DialogProps";
import CircularLoading from "../misc/CircularLoading";
import { createConversation } from "@/utilities/fetch";
import { getUser } from "@/utilities/fetch";
import { UserProps } from "@/types/UserProps";

export default function NewGroupDialog({ open, handleNewMessageClose, token }: NewMessageDialogProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user", token.username, "friends"],
    queryFn: () => getUser(token.username),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setName("");
      setSelected({});
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const members = Object.keys(selected).filter(k => selected[k]);
      if (members.length === 0) throw new Error("Select at least one friend");
      if (members.length > 4) throw new Error("Max 4 friends (5 total participants)");
      const convName = name && name.trim().length > 0
        ? name.trim()
        : members.join(", ");
      return createConversation(token.id, members, convName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", token.username] });
      handleNewMessageClose();
    }
  });

  if (!open) return null;

  const friends = (data?.friends || []) as UserProps[];

  return (
    <Dialog className="dialog" open={open} onClose={handleNewMessageClose} fullWidth maxWidth="xs">
      <DialogTitle className="title">New Group</DialogTitle>
      <DialogContent>
        <div className="input">
          <TextField
            fullWidth
            placeholder="Group name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="user-list">
          {isLoading ? (
            <CircularLoading />
          ) : (
            friends.map(f => (
              <FormControlLabel
                key={f.id}
                control={<Checkbox checked={!!selected[f.id]} onChange={(e) => setSelected(prev => ({ ...prev, [f.id]: e.target.checked }))} />}
                label={`@${f.username}`}
              />
            ))
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-dark" onClick={() => mutation.mutate()} disabled={mutation.isLoading}>
            {mutation.isLoading ? "Creating..." : "Create"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
