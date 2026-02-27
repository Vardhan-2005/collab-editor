/**
 * UserList - sidebar showing connected collaborators
 */
export default function UserList({ users, typingUsers, myUserId, roomId }) {
  const typingIds = Object.keys(typingUsers)

  return (
    <div className="flex flex-col h-full">
      {/* Room ID Header */}
      <div className="p-4 border-b border-base-600">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Room</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-semibold tracking-widest"
                style={{ color: '#00ffcc' }}>
            {roomId}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(roomId)
            }}
            title="Copy room ID"
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collaborators */}
      <div className="p-4 flex-1 overflow-y-auto">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">
          Online — {users.length}
        </p>
        <div className="space-y-2">
          {users.map((user, i) => {
            const isMe = user.userId === myUserId
            const isTyping = typingIds.includes(user.userId)

            return (
              <div
                key={user.userId}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200
                           hover:bg-white/5 animate-slide-in-left"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both', opacity: 0 }}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                  style={{ background: user.color }}
                >
                  {user.username?.[0]?.toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-slate-200 font-medium truncate">
                      {user.username}
                    </span>
                    {isMe && (
                      <span className="text-xs px-1.5 py-0.5 rounded text-black font-medium"
                            style={{ background: user.color, opacity: 0.8 }}>
                        you
                      </span>
                    )}
                  </div>

                  {/* Typing indicator */}
                  {isTyping && !isMe && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[0, 1, 2].map(j => (
                        <span
                          key={j}
                          className="inline-block w-1 h-1 rounded-full animate-typing-dot"
                          style={{
                            background: user.color,
                            animationDelay: `${j * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Status dot */}
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                     style={{ background: user.color, boxShadow: `0 0 6px ${user.color}` }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom: Language info */}
      <div className="p-4 border-t border-base-600">
        <p className="text-xs text-slate-600">
          Auto-saving every 5s
        </p>
      </div>
    </div>
  )
}
