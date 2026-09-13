import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  Image,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../services/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CommentUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
}

interface ArtifactComment {
  id: string;
  artifact_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes: number;
  created_at: string;
  user: CommentUser;
  replies: ArtifactComment[];
  liked_by_me: boolean;
}

interface Props {
  artifactId: string;
  currentUserId: string | null;
  currentUser?: {
    first_name: string;
    last_name: string;
    profile_picture?: string | null;
  } | null;
  C: any;
  fontScale: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();

  const m = Math.floor(diff / 60000);

  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m`;
  
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;

  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function avatarBg(uid: string) {
  const colors = [
    '#F2E6D0',
    '#D4E8D4',
    '#D0E4F0',
    '#E8D4E8',
    '#E8E0D0',
    '#D0D8E8',
  ];

  let h = 0;

  for (let i = 0; i < uid.length; i++) {
    h = uid.charCodeAt(i) + ((h << 5) - h);
  }

  return colors[Math.abs(h) % colors.length];
}

function avatarFg(uid: string) {
  const colors = [
    '#7A5C10',
    '#285A34',
    '#145070',
    '#6A1450',
    '#504C10',
    '#10245A',
  ];

  let h = 0;

  for (let i = 0; i < uid.length; i++) {
    h = uid.charCodeAt(i) + ((h << 5) - h);
  }

  return colors[Math.abs(h) % colors.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function Avi({
  user,
  size = 38,
}: {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string | null;
  };
  size?: number;
}) {
  const initials =
    ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? ''))
      .toUpperCase() || '?';

  if (user.profile_picture) {
    return (
      <Image
        source={{ uri: user.profile_picture }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarBg(user.id || initials),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.36,
          fontWeight: '800',
          color: avatarFg(user.id || initials),
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comment Row
// ─────────────────────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  currentUserId,
  onReply,
  onLike,
  onDelete,
  isReply = false,
  C,
  fontScale,
}: {
  comment: ArtifactComment;
  currentUserId: string | null;
  onReply: (c: ArtifactComment) => void;
  onLike: (c: ArtifactComment) => void;
  onDelete: (c: ArtifactComment) => void;
  isReply?: boolean;
  C: any;
  fontScale: number;
}) {
  const heartScale = useRef(new Animated.Value(1)).current;

  const isOwn = currentUserId === comment.user_id;

  const fullName =
    `${comment.user.first_name} ${comment.user.last_name}`.trim() ||
    'Unknown User';

  const gold = C.gold ?? '#B99345';
  const ink = C.ink ?? '#191611';
  const inkMid = C.inkMid ?? '#6E665B';
  const inkDim = C.inkDim ?? '#A9A197';
  const border = C.border ?? '#E8E0D5';

  const bubbleColor = isOwn
    ? (C.goldSoft ?? '#F7EEDC')
    : (C.raised ?? '#F8F7F4');

  const animateLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.35,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }),
    ]).start();

    onLike(comment);
  };

  return (
    <View style={[S.commentRow, isReply && S.replyRow]}>
      {/* Avatar */}
      <View style={S.avatarColumn}>
        <Avi
          user={comment.user}
          size={isReply ? 32 : 38}
        />

        {isReply && (
          <View
            style={[
              S.replyAvatarLine,
              {
                backgroundColor: border,
              },
            ]}
          />
        )}
      </View>

      {/* Content */}
      <View style={S.commentContent}>
        <View
          style={[
            S.commentBubble,
            {
              backgroundColor: bubbleColor,
            },
          ]}
        >
          {/* Name + time */}
          <View style={S.commentHeader}>
            <View style={S.nameContainer}>
              <Text
                numberOfLines={1}
                style={[
                  S.userName,
                  {
                    color: ink,
                    fontSize: 12.5 * fontScale,
                  },
                ]}
              >
                {fullName}
              </Text>

              {isOwn && (
                <View
                  style={[
                    S.youBadge,
                    {
                      backgroundColor: gold,
                    },
                  ]}
                >
                  <Text
                    style={[
                      S.youBadgeText,
                      {
                        fontSize: 8 * fontScale,
                      },
                    ]}
                  >
                    YOU
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[
                S.commentTime,
                {
                  color: inkDim,
                  fontSize: 10 * fontScale,
                },
              ]}
            >
              {timeAgo(comment.created_at)}
            </Text>
          </View>

          {/* Comment text */}
          <Text
            style={[
              S.commentText,
              {
                color: inkMid,
                fontSize: 13.5 * fontScale,
              },
            ]}
          >
            {comment.content}
          </Text>
        </View>

        {/* Actions */}
        <View style={S.actionRow}>
          <TouchableOpacity
            onPress={animateLike}
            activeOpacity={0.65}
            style={[
              S.action,
              comment.liked_by_me && {
                backgroundColor: '#FFF0F0',
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [{ scale: heartScale }],
              }}
            >
              <Ionicons
                name={
                  comment.liked_by_me
                    ? 'heart'
                    : 'heart-outline'
                }
                size={14}
                color={
                  comment.liked_by_me
                    ? '#DF5757'
                    : inkDim
                }
              />
            </Animated.View>

            <Text
              style={[
                S.actionText,
                {
                  color: comment.liked_by_me
                    ? '#DF5757'
                    : inkDim,
                  fontSize: 10.5 * fontScale,
                },
              ]}
            >
              {comment.likes > 0
                ? comment.likes
                : 'Like'}
            </Text>
          </TouchableOpacity>

          {!isReply && currentUserId && (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onReply(comment);
              }}
              activeOpacity={0.65}
              style={S.action}
            >
              <Ionicons
                name="chatbubble-outline"
                size={13}
                color={inkDim}
              />

              <Text
                style={[
                  S.actionText,
                  {
                    color: inkDim,
                    fontSize: 10.5 * fontScale,
                  },
                ]}
              >
                Reply
              </Text>
            </TouchableOpacity>
          )}

          {isOwn && (
            <TouchableOpacity
              onPress={() => onDelete(comment)}
              activeOpacity={0.65}
              style={S.action}
            >
              <Ionicons
                name="trash-outline"
                size={13}
                color={inkDim}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Reply count */}
        {!isReply && comment.replies.length > 0 && (
          <View style={S.replyCount}>
            <View
              style={[
                S.replyCountLine,
                {
                  backgroundColor: border,
                },
              ]}
            />

            <Ionicons
              name="return-down-forward-outline"
              size={11}
              color={gold}
            />

            <Text
              style={[
                S.replyCountText,
                {
                  color: gold,
                  fontSize: 10.5 * fontScale,
                },
              ]}
            >
              {comment.replies.length}{' '}
              {comment.replies.length === 1
                ? 'reply'
                : 'replies'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ArtifactComments({
  artifactId,
  currentUserId,
  currentUser,
  C,
  fontScale,
}: Props) {
  const [comments, setComments] =
    useState<ArtifactComment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [posting, setPosting] =
    useState(false);

  const [text, setText] =
    useState('');

  const [replyTo, setReplyTo] =
    useState<ArtifactComment | null>(null);

  const inputRef =
    useRef<TextInput>(null);

  const scrollRef =
    useRef<ScrollView>(null);

  // Keyboard height — used to push the input row above the keyboard inside a modal
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ───────────────────────────────────────────────────────────────────────────
  // Theme
  // ───────────────────────────────────────────────────────────────────────────

  const gold = C.gold ?? '#B99345';
  const ink = C.ink ?? '#191611';
  const inkDim = C.inkDim ?? '#A9A197';
  const border = C.border ?? '#E8E0D5';
  const raised = C.raised ?? '#FFFFFF';
  const surface = C.surface ?? '#F7F4EF';
  const goldSoft = C.goldSoft ?? '#F7EEDC';
  const borderGold = C.borderGold ?? '#E3D3B1';
  const inkMid = C.inkMid ?? '#6E665B';

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch comments
  // ───────────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data: rows, error } = await supabase
        .from('artifact_comments')
        .select(
          'id, artifact_id, user_id, parent_id, content, likes, created_at'
        )
        .eq('artifact_id', artifactId)
        .order('created_at', {
          ascending: true,
        });

      if (error) throw error;

      if (!rows || rows.length === 0) {
        setComments([]);
        return;
      }

      const uids = [
        ...new Set(
          rows.map((r: any) => r.user_id)
        ),
      ];

      const { data: users } = await supabase
        .from('users')
        .select(
          'id, first_name, last_name, profile_picture'
        )
        .in('id', uids);

      const uMap = new Map<string, CommentUser>(
        (users ?? []).map((u: any) => [
          u.id,
          u as CommentUser,
        ])
      );

      let likedSet = new Set<string>();

      if (currentUserId) {
        const { data: likes } = await supabase
          .from('artifact_comment_likes')
          .select('comment_id')
          .eq('user_id', currentUserId)
          .in(
            'comment_id',
            rows.map((r: any) => r.id)
          );

        likedSet = new Set(
          (likes ?? []).map(
            (r: any) => r.comment_id
          )
        );
      }

      const fallback: CommentUser = {
        id: '',
        first_name: 'Unknown',
        last_name: '',
        profile_picture: null,
      };

      const nested: ArtifactComment[] = rows
        .filter((r: any) => !r.parent_id)
        .map((r: any) => ({
          ...r,

          user:
            uMap.get(r.user_id) ??
            fallback,

          liked_by_me:
            likedSet.has(r.id),

          replies: rows
            .filter(
              (reply: any) =>
                reply.parent_id === r.id
            )
            .map((reply: any) => ({
              ...reply,

              user:
                uMap.get(reply.user_id) ??
                fallback,

              liked_by_me:
                likedSet.has(reply.id),

              replies: [],
            })),
        }));

      setComments(nested);
    } catch (e: any) {
      console.warn(
        'Comments fetch error:',
        e?.message
      );
    } finally {
      setLoading(false);
    }
  }, [artifactId, currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Keyboard listener — push input above keyboard inside modal ──────────────
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Post comment
  // ───────────────────────────────────────────────────────────────────────────

  const post = async () => {
    const trimmed = text.trim();

    if (
      !trimmed ||
      !currentUserId ||
      posting
    ) {
      return;
    }

    setPosting(true);

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Medium
    );

    const { error } = await supabase
      .from('artifact_comments')
      .insert({
        artifact_id: artifactId,
        user_id: currentUserId,
        parent_id: replyTo?.id ?? null,
        content: trimmed,
      });

    if (error) {
      Alert.alert(
        'Could not post',
        error.message
      );
    } else {
      setText('');
      setReplyTo(null);

      await load();

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({
          animated: true,
        });
      }, 150);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    }

    setPosting(false);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Like
  // ───────────────────────────────────────────────────────────────────────────

  const like = async (
    comment: ArtifactComment
  ) => {
    if (!currentUserId) return;

    const wasLiked =
      comment.liked_by_me;

    const patch = (
      c: ArtifactComment
    ): ArtifactComment =>
      c.id === comment.id
        ? {
            ...c,
            liked_by_me: !wasLiked,
            likes: Math.max(
              0,
              c.likes +
                (wasLiked ? -1 : 1)
            ),
          }
        : {
            ...c,
            replies:
              c.replies.map(patch),
          };

    // Optimistic update
    setComments((previous) =>
      previous.map(patch)
    );

    if (wasLiked) {
      await supabase
        .from(
          'artifact_comment_likes'
        )
        .delete()
        .eq(
          'comment_id',
          comment.id
        )
        .eq(
          'user_id',
          currentUserId
        );
    } else {
      await supabase
        .from(
          'artifact_comment_likes'
        )
        .insert({
          comment_id: comment.id,
          user_id: currentUserId,
        });
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Delete
  // ───────────────────────────────────────────────────────────────────────────

  const del = (
    comment: ArtifactComment
  ) => {
    Alert.alert(
      'Delete comment?',
      'This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            const { error } =
              await supabase
                .from(
                  'artifact_comments'
                )
                .delete()
                .eq(
                  'id',
                  comment.id
                );

            if (!error) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType
                  .Success
              );

              load();
            } else {
              Alert.alert(
                'Could not delete',
                error.message
              );
            }
          },
        },
      ]
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Counts
  // ───────────────────────────────────────────────────────────────────────────

  const total =
    comments.reduce(
      (sum, comment) =>
        sum +
        1 +
        comment.replies.length,
      0
    );

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        S.container,
        {
          borderTopColor: border,
        },
      ]}
    >
      {/* ─────────────────────────────────────────────────────────────────────
          Header
      ───────────────────────────────────────────────────────────────────── */}

      <View style={S.header}>
        <View style={S.headerLeft}>
          <View
            style={[
              S.headerIcon,
              {
                backgroundColor:
                  goldSoft,
              },
            ]}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={17}
              color={gold}
            />
          </View>

          <View>
            <Text
              style={[
                S.headerTitle,
                {
                  color: ink,
                  fontSize:
                    15 * fontScale,
                },
              ]}
            >
              Comments
            </Text>

            <Text
              style={[
                S.headerSubtitle,
                {
                  color: inkDim,
                  fontSize:
                    10.5 * fontScale,
                },
              ]}
            >
              {total === 0
                ? 'Start the conversation'
                : `${total} ${
                    total === 1
                      ? 'comment'
                      : 'comments'
                  }`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={load}
          disabled={loading}
          activeOpacity={0.7}
          style={[
            S.refreshButton,
            {
              borderColor: border,
              backgroundColor: raised,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={gold}
            />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={16}
              color={inkDim}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* ─────────────────────────────────────────────────────────────────────
          Comment Feed
      ───────────────────────────────────────────────────────────────────── */}

      <View
        style={[
          S.feedShell,
          {
            borderColor: borderGold,
            backgroundColor: raised,
          },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          style={S.feedScroll}
          contentContainerStyle={[
            S.feedContent,
            total === 0 &&
              S.emptyFeedContent,
          ]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={S.center}>
              <View
                style={[
                  S.loadingIcon,
                  {
                    backgroundColor:
                      goldSoft,
                  },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={gold}
                />
              </View>

              <Text
                style={[
                  S.loadingText,
                  {
                    color: inkDim,
                    fontSize:
                      11.5 *
                      fontScale,
                  },
                ]}
              >
                Loading comments...
              </Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={S.emptyState}>
              <View
                style={[
                  S.emptyIcon,
                  {
                    backgroundColor:
                      goldSoft,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={28}
                  color={gold}
                />
              </View>

              <Text
                style={[
                  S.emptyTitle,
                  {
                    color: ink,
                    fontSize:
                      14.5 *
                      fontScale,
                  },
                ]}
              >
                No comments yet
              </Text>

              <Text
                style={[
                  S.emptySubtitle,
                  {
                    color: inkDim,
                    fontSize:
                      11.5 *
                      fontScale,
                  },
                ]}
              >
                Be the first to share
                your thoughts about
                this artifact.
              </Text>
            </View>
          ) : (
            comments.map(
              (comment, index) => (
                <View
                  key={comment.id}
                >
                  {index > 0 && (
                    <View
                      style={[
                        S.separator,
                        {
                          backgroundColor:
                            border,
                        },
                      ]}
                    />
                  )}

                  <CommentRow
                    comment={comment}
                    currentUserId={
                      currentUserId
                    }
                    onReply={(c) => {
                      setReplyTo(c);

                      setTimeout(() => {
                        inputRef.current?.focus();
                      }, 120);
                    }}
                    onLike={like}
                    onDelete={del}
                    C={C}
                    fontScale={
                      fontScale
                    }
                  />

                  {/* Replies */}
                  {comment.replies
                    .length > 0 && (
                    <View
                      style={[
                        S.repliesContainer,
                        {
                          borderLeftColor:
                            borderGold,
                        },
                      ]}
                    >
                      {comment.replies.map(
                        (reply) => (
                          <CommentRow
                            key={reply.id}
                            comment={
                              reply
                            }
                            currentUserId={
                              currentUserId
                            }
                            onReply={() => {
                              setReplyTo(
                                comment
                              );

                              setTimeout(
                                () => {
                                  inputRef.current?.focus();
                                },
                                120
                              );
                            }}
                            onLike={like}
                            onDelete={
                              del
                            }
                            isReply
                            C={C}
                            fontScale={
                              fontScale
                            }
                          />
                        )
                      )}
                    </View>
                  )}
                </View>
              )
            )
          )}
        </ScrollView>
      </View>

      {/* ─────────────────────────────────────────────────────────────────────
          Composer
      ───────────────────────────────────────────────────────────────────── */}

      <View
        style={[
          S.composer,
          {
            borderColor: borderGold,
            backgroundColor: raised,
          },
        ]}
      >
        {/* Reply banner */}
        {replyTo && (
          <View
            style={[
              S.replyBanner,
              {
                backgroundColor:
                  goldSoft,
                borderColor:
                  borderGold,
              },
            ]}
          >
            <View
              style={[
                S.replyBannerIcon,
                {
                  backgroundColor:
                    raised,
                },
              ]}
            >
              <Ionicons
                name="return-down-forward-outline"
                size={13}
                color={gold}
              />
            </View>

            <View style={S.replyBannerContent}>
              <Text
                style={[
                  S.replyLabel,
                  {
                    color: inkDim,
                    fontSize:
                      9.5 *
                      fontScale,
                  },
                ]}
              >
                REPLYING TO
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  S.replyName,
                  {
                    color: ink,
                    fontSize:
                      11.5 *
                      fontScale,
                  },
                ]}
              >
                {replyTo.user.first_name}{' '}
                {replyTo.user.last_name}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                setReplyTo(null)
              }
              hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
              }}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={inkDim}
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={[S.inputRow, { paddingBottom: keyboardHeight }]}>
          {/* User avatar */}
          {currentUser ? (
            <Avi
              user={{
                id:
                  currentUserId ??
                  'me',
                ...currentUser,
              }}
              size={36}
            />
          ) : (
            <View
              style={[
                S.anonymousAvatar,
                {
                  backgroundColor:
                    goldSoft,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={gold}
              />
            </View>
          )}

          {/* Input */}
          {currentUserId ? (
            <View
              style={[
                S.inputWrap,
                {
                  backgroundColor:
                    surface,
                  borderColor:
                    text.trim()
                      ? gold
                      : border,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[
                  S.inputField,
                  {
                    color: ink,
                    fontSize:
                      13.5 *
                      fontScale,
                  },
                ]}
                placeholder={
                  replyTo
                    ? `Reply to ${replyTo.user.first_name}...`
                    : 'Share your thoughts...'
                }
                placeholderTextColor={
                  inkDim
                }
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                returnKeyType="default"
              />

              {text.length > 0 && (
                <Text
                  style={[
                    S.charCount,
                    {
                      color:
                        text.length >
                        450
                          ? '#D77A3D'
                          : inkDim,
                      fontSize:
                        9 *
                        fontScale,
                    },
                  ]}
                >
                  {text.length}/500
                </Text>
              )}
            </View>
          ) : (
            <View
              style={[
                S.inputWrap,
                S.lockedInput,
                {
                  backgroundColor:
                    surface,
                  borderColor:
                    border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={14}
                color={inkDim}
              />

              <Text
                style={[
                  S.lockedText,
                  {
                    color: inkDim,
                    fontSize:
                      12.5 *
                      fontScale,
                  },
                ]}
              >
                Sign in to join the
                conversation
              </Text>
            </View>
          )}

          {/* Send */}
          {currentUserId && (
            <TouchableOpacity
              onPress={post}
              disabled={
                !text.trim() ||
                posting
              }
              activeOpacity={0.8}
              style={[
                S.sendButton,
                {
                  backgroundColor:
                    text.trim()
                      ? gold
                      : border,
                  opacity:
                    text.trim()
                      ? 1
                      : 0.6,
                },
              ]}
            >
              {posting ? (
                <ActivityIndicator
                  size="small"
                  color="#FFF"
                />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color="#FFF"
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Container
  container: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  headerSubtitle: {
    marginTop: 2,
    fontWeight: '500',
  },

  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Feed
  feedShell: {
    borderWidth: 1,
    borderRadius: 20,
    height: 450,
    minHeight: 120,

    elevation: 1,

    shadowOpacity: 0.04,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
  },

  feedScroll: {
    flex: 1,
  },

  feedContent: {
    paddingVertical: 7,
  },

  emptyFeedContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Comment
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 9,
  },

  replyRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  avatarColumn: {
    alignItems: 'center',
  },

  replyAvatarLine: {
    width: 1,
    flex: 1,
    minHeight: 8,
    marginTop: 5,
  },

  commentContent: {
    flex: 1,
    minWidth: 0,
  },

  commentBubble: {
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },

  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },

  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },

  userName: {
    fontWeight: '800',
    flexShrink: 1,
    letterSpacing: -0.1,
  },

  youBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },

  youBadgeText: {
    color: '#FFF',
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  commentTime: {
    fontWeight: '500',
    flexShrink: 0,
  },

  commentText: {
    lineHeight: 20,
    fontWeight: '400',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingLeft: 3,
    gap: 4,
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
  },

  actionText: {
    fontWeight: '700',
  },

  // Replies
  repliesContainer: {
    marginLeft: 33,
    marginRight: 8,
    borderLeftWidth: 2,
    paddingLeft: 5,
  },

  replyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
    marginLeft: 4,
  },

  replyCountLine: {
    width: 14,
    height: 1,
    borderRadius: 1,
  },

  replyCountText: {
    fontWeight: '700',
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 61,
    marginRight: 14,
  },

  // Loading
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 45,
    paddingHorizontal: 25,
  },

  loadingIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  loadingText: {
    fontWeight: '600',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingVertical: 50,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontWeight: '800',
    marginBottom: 5,
    letterSpacing: -0.2,
  },

  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 230,
  },

  // Composer
  composer: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingTop: 10,
    paddingBottom:
      Platform.OS === 'ios'
        ? 10
        : 8,

    elevation: 1,

    shadowOpacity: 0.04,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
  },

  // Reply banner
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginBottom: 9,
    gap: 8,
  },

  replyBannerIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  replyBannerContent: {
    flex: 1,
  },

  replyLabel: {
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 1,
  },

  replyName: {
    fontWeight: '800',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },

  anonymousAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputWrap: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,

    borderWidth: 1.5,
    borderRadius: 17,

    paddingHorizontal: 12,
    paddingTop:
      Platform.OS === 'ios'
        ? 9
        : 7,
    paddingBottom:
      Platform.OS === 'ios'
        ? 9
        : 7,

    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },

  inputField: {
    flex: 1,
    lineHeight: 19,
    maxHeight: 88,
    padding: 0,
    margin: 0,
  },

  charCount: {
    alignSelf: 'flex-end',
    marginBottom: 1,
    fontWeight: '600',
  },

  lockedInput: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    opacity: 0.75,
  },

  lockedText: {
    flex: 1,
    fontWeight: '600',
  },

  // Send
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
