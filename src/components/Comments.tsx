import React, { useState, useEffect, FormEvent } from 'react';
import { useUser } from '../context/UserContext';
import '../styles/Comments.css';

interface CommentUser {
  _id?: string;
  id?: string;
  name: string;
  role: 'admin' | 'user';
}

interface CommentData {
  _id: string;
  parentId?: string | null;
  content: string;
  user: CommentUser;
  userId?: CommentUser;
  createdAt: string;
  children?: CommentData[];
}

interface CommentsProps {
  courseId: string;
  lessonId?: string;
}

// ✅ FIXED: Removed /api from base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Comments: React.FC<CommentsProps> = ({ courseId, lessonId }) => {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, token } = useUser();
  
  // ✅ Fallback user from localStorage
  const [authUser, setAuthUser] = useState<any>(null);

  // ✅ Get user from context or localStorage
  useEffect(() => {
    if (user) {
      setAuthUser(user);
    } else {
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        try {
          setAuthUser(JSON.parse(storedUser));
        } catch (err) {
          console.error('[Comments] Error parsing stored user:', err);
        }
      }
    }
  }, [user]);

  // ✅ Get token from context or localStorage
  const currentUser = user || authUser;
  const currentToken = token || localStorage.getItem('authToken');

  console.log('[Comments] User status:', {
    hasUser: !!currentUser,
    userName: currentUser?.name,
    hasToken: !!currentToken,
    lessonId,
  });

  useEffect(() => {
    if (courseId) loadComments();
  }, [courseId, lessonId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      };
      // ✅ FIXED: Added /api prefix
      const res = await fetch(`${API_BASE}/api/comments/${courseId}?lessonId=${lessonId || ''}`, { headers });
      if (res.ok) {
        const data = await res.json();
        console.log('🧠 BACKEND COMMENTS RESPONSE:', data.comments);
        setComments(buildCommentTree(data.comments || []));
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildCommentTree = (flatComments: CommentData[]): CommentData[] => {
    const map = new Map<string, CommentData>();
    const roots: CommentData[] = [];

    flatComments.forEach(c => map.set(c._id, { ...c, children: [] }));
    map.forEach(c => {
      if (c.parentId) {
        const parent = map.get(c.parentId);
        if (parent) parent.children!.push(c);
        else roots.push(c);
      } else roots.push(c);
    });
    return roots;
  };

  const submitComment = async (content: string, parentId?: string) => {
    if (!currentUser || !currentToken) {
      alert('Please log in to comment');
      return false;
    }

    // ✅ Get user ID from multiple possible fields
    const userId = currentUser._id || currentUser.id;
    if (!userId) {
      alert('Unable to identify user. Please refresh and try again.');
      return false;
    }

    try {
      // ✅ FIXED: Added /api prefix
      const res = await fetch(`${API_BASE}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          parentId,
          content: content.trim(),
          user: { 
            id: userId, 
            name: currentUser.name, 
            role: currentUser.role || 'user' 
          },
        }),
      });
      if (res.ok) {
        console.log('[Comments] Comment posted successfully');
        await loadComments();
        return true;
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to post comment');
        return false;
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      alert('Failed to post comment');
      return false;
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!currentUser || !currentToken) {
      alert('Please log in to delete');
      return;
    }

    // ✅ Confirmation before delete
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      // ✅ FIXED: Added /api prefix
      const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        console.log('[Comments] Comment deleted successfully');
        setComments(prev => removeCommentById(prev, commentId));
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment');
    }
  };

  const removeCommentById = (arr: CommentData[], id: string): CommentData[] =>
    arr
      .filter(c => c._id !== id)
      .map(c => ({ ...c, children: c.children ? removeCommentById(c.children, id) : [] }));

  const handleSubmitNewComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    const ok = await submitComment(newComment);
    if (ok) setNewComment('');
    setIsSubmitting(false);
  };

  const CommentItem: React.FC<{ comment: CommentData; depth?: number }> = ({ comment, depth = 0 }) => {
    const [showReply, setShowReply] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleReply = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!replyText.trim()) return;
      setIsReplying(true);
      const ok = await submitComment(replyText, comment._id);
      if (ok) {
        setReplyText('');
        setShowReply(false);
      }
      setIsReplying(false);
    };

    // ✅ Handle both user + userId
    const commentOwnerId =
      comment.user?.id ||
      comment.user?._id ||
      comment.userId?._id ||
      comment.userId?.id;

    // ✅ Get current user ID with fallback
    const currentUserId = currentUser?.id || currentUser?._id;
    const canDelete =
      currentUser &&
      (currentUser.role === 'admin' ||
        (commentOwnerId && currentUserId && commentOwnerId.toString() === currentUserId.toString()));

    return (
      <div className={`comment-item ${depth > 0 ? 'nested' : ''}`}>
        <div className="comment-card">
          <div className="comment-header">
            <div className="comment-user">
              <div className="avatar">{comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className="user-info">
                <div className="user-name-role">
                  <span className="user-name">{comment.user?.name || 'Anonymous'}</span>
                  {comment.user?.role === 'admin' && <span className="role admin">Admin</span>}
                </div>
                <span className="comment-date">
                  {new Date(comment.createdAt).toLocaleDateString()} •{' '}
                  {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div className="comment-content">{comment.content}</div>

          <div className="comment-actions">
            {currentUser && (
              <button onClick={() => setShowReply(!showReply)} className="reply-btn">
                💬 Reply
              </button>
            )}
            {canDelete && (
              <button onClick={() => deleteComment(comment._id)} className="delete-btn">
                🗑️ Delete
              </button>
            )}
          </div>

          {showReply && currentUser && (
            <form onSubmit={handleReply} className="reply-form">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.user?.name || 'this comment'}...`}
                rows={3}
                className="reply-textarea"
                required
              />
              <div className="reply-buttons">
                <button type="button" onClick={() => setShowReply(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={isReplying || !replyText.trim()} className="post-reply-btn">
                  {isReplying ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </form>
          )}
        </div>

        {comment.children?.map(child => (
          <CommentItem key={child._id} comment={child} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="comments-container">
      <div className="comments-card">
        <h3 className="comments-title">💬 Discussion ({comments.length})</h3>

        {currentUser ? (
          <form onSubmit={handleSubmitNewComment} className="new-comment-form">
            <div className="new-comment-wrapper">
              <div className="avatar">{currentUser.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className="new-comment-input">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add to the discussion..."
                  rows={3}
                  className="new-comment-textarea"
                  required
                />
                <div className="new-comment-button-wrapper">
                  <button type="submit" disabled={isSubmitting || !newComment.trim()} className="post-comment-btn">
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="login-prompt">
            <p>👤 Please log in to join the discussion.</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="login-prompt-btn"
            >
              Log In
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-comments">
            <div className="spinner"></div>
            <p>Loading comments...</p>
          </div>
        ) : comments.length > 0 ? (
          <div className="comments-list">
            {comments.map(comment => (
              <CommentItem key={comment._id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="no-comments">
            <p>🗨️ No comments yet. Be the first to start the discussion!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments;
