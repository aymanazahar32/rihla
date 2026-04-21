import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useGetFriends, useGetPendingRequests, useSearchUsers,
  useSendFriendRequest, useAcceptFriendRequest, useDeclineFriendRequest,
  useGetInviteToken, useAcceptInviteToken,
} from "@/lib/api-client";
import { Users, Search, Link2, Check, X, UserPlus, Copy, CheckCheck, Loader2 } from "lucide-react";

export default function FriendsPage() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  const { data: friends = [], isLoading: friendsLoading } = useGetFriends();
  const { data: pending = [] } = useGetPendingRequests();
  const { data: searchResults = [], isFetching: searching } = useSearchUsers(search);
  const { data: inviteToken } = useGetInviteToken();

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const acceptInvite = useAcceptInviteToken();

  const inviteLink = inviteToken
    ? `${window.location.origin}/friends?invite=${inviteToken}`
    : null;

  // Auto-process invite token from URL
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const token = params.get("invite");
    if (!token) return;
    acceptInvite.mutate(token, {
      onSuccess: () => setInviteMsg({ ok: true, text: "Friend request sent!" }),
      onError: (e: any) => setInviteMsg({ ok: false, text: e?.error ?? "Failed to process invite." }),
    });
  }, []);

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptInviteInput = () => {
    const token = inviteInput.includes("?invite=")
      ? inviteInput.split("?invite=")[1]
      : inviteInput.trim();
    if (!token) return;
    acceptInvite.mutate(token, {
      onSuccess: () => { setInviteMsg({ ok: true, text: "Friend request sent!" }); setInviteInput(""); },
      onError: (e: any) => setInviteMsg({ ok: false, text: e?.error ?? "Invalid link." }),
    });
  };

  const handleSendRequest = (userId: string) => {
    sendRequest.mutate(userId, {
      onSuccess: () => setRequestedIds((s) => new Set(s).add(userId)),
      onError: (e: any) => alert(e?.error ?? "Could not send request."),
    });
  };

  const friendIds = new Set(friends.map((f) => f.friend.id));
  const pendingIds = new Set(pending.map((p) => p.friend.id));

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Friends</h1>
        <p className="text-muted-foreground mt-1 text-sm">Ride with people you trust</p>
      </div>

      {/* Auto-invite message */}
      {inviteMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${inviteMsg.ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
          {inviteMsg.text}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Find by name</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        {search.trim().length >= 2 && (
          <div className="mt-2 space-y-2">
            {searchResults.length === 0 && !searching && (
              <p className="text-sm text-muted-foreground px-1">No users found. Try sharing your invite link instead.</p>
            )}
            {searchResults.map((u: any) => {
              const isFriend = friendIds.has(u.id);
              const isPending = pendingIds.has(u.id);
              const isRequested = requestedIds.has(u.id);
              return (
                <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-card ring-1 ring-border/50">
                  <div>
                    <p className="font-semibold text-sm">{u.name}</p>
                    {u.university && <p className="text-xs text-muted-foreground">{u.university}</p>}
                  </div>
                  {isFriend ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0">Friends</Badge>
                  ) : isPending ? (
                    <Badge variant="secondary">Pending</Badge>
                  ) : isRequested ? (
                    <Badge variant="secondary">Requested</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => handleSendRequest(u.id)}>
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite link */}
      <Card className="border-0 ring-1 ring-border/50 mb-6">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Invite via link</p>

          {/* Your link to share */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Share your link</p>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground truncate font-mono">
                {inviteLink ?? "Generating…"}
              </div>
              <Button size="sm" variant="outline" className="rounded-lg shrink-0" onClick={handleCopy} disabled={!inviteLink}>
                {copied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Enter a received link */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Or paste a friend's link</p>
            <div className="flex gap-2">
              <Input
                className="text-sm h-9"
                placeholder="Paste invite link or token…"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
              />
              <Button
                size="sm"
                className="rounded-lg shrink-0"
                onClick={handleAcceptInviteInput}
                disabled={!inviteInput.trim() || acceptInvite.isPending}
              >
                {acceptInvite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Pending requests <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px]">{pending.length}</span>
          </p>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card ring-1 ring-border/50">
                <div>
                  <p className="font-semibold text-sm">{p.friend.name}</p>
                  {p.friend.university && <p className="text-xs text-muted-foreground">{p.friend.university}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8 rounded-full border-emerald-200 hover:bg-emerald-50 text-emerald-600"
                    onClick={() => acceptRequest.mutate(p.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8 rounded-full border-red-200 hover:bg-red-50 text-red-500"
                    onClick={() => declineRequest.mutate(p.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Your friends {!friendsLoading && `(${friends.length})`}
        </p>
        {friendsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">No friends yet</p>
            <p className="text-xs mt-1">Search by name or share your invite link</p>
          </div>
        ) : (
          <div className="space-y-2 pb-24">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card ring-1 ring-border/50">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {f.friend.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{f.friend.name}</p>
                  {f.friend.university && <p className="text-xs text-muted-foreground truncate">{f.friend.university}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
