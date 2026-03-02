/**
 * EditorPage - full-screen collaborative code editor
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useSocket } from '../hooks/useSocket'
import { useAutoSave } from '../hooks/useAutoSave'
import { getSocket } from '../utils/socket'   // 👈 ADDED
import UserList from '../components/UserList'
import Notifications, { useNotifications } from '../components/Notifications'

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'rust', 'go',
  'cpp', 'java', 'html', 'css', 'json', 'markdown',
]

export default function EditorPage({ user, onLeave }) {
  const { userId, username, roomId } = user

  const editorRef = useRef(null)
  const contentRef = useRef('')
  const debounceRef = useRef(null)

  const [language, setLanguage] = useState('javascript')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [editorFocused, setEditorFocused] = useState(false)
  const [editOwner, setEditOwner] = useState(null)   // 👈 ADDED

  const { notifications, addNotification } = useNotifications()

  // ── Listen for edit lock changes ─────────────────────────
  useEffect(() => {
    const socket = getSocket()

    socket.on('edit_access_changed', ({ userId }) => {
      setEditOwner(userId)
    })

    return () => {
      socket.off('edit_access_changed')
    }
  }, [])

  // ── Handle incoming code updates ────────────────────────────
  const handleCodeUpdate = useCallback((newContent, isInitial) => {
    if (!editorRef.current) return
    const editor = editorRef.current
    const model = editor.getModel()
    if (!model) return

    if (isInitial) {
      model.setValue(newContent)
      contentRef.current = newContent
    } else {
      if (model.getValue() !== newContent) {
        model.pushEditOperations(
          [],
          [{
            range: model.getFullModelRange(),
            text: newContent
          }],
          () => null
        )
        contentRef.current = newContent
      }
    }
  }, [])

  // ── Socket connection ────────────────────────────────────────
  const { activeUsers, typingUsers, myColor, emitCodeChange, emitTyping } =
    useSocket({
      roomId, userId, username,
      onCodeUpdate: handleCodeUpdate,
      onNotification: addNotification,
    })

  // ── Auto-save ────────────────────────────────────────────────
  useAutoSave(roomId, () => contentRef.current)

  // ── Editor change handler ───────────────────────────────────
  function handleEditorChange(value) {
    const newValue = value || ''
    contentRef.current = newValue

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      emitCodeChange(newValue)
      emitTyping()
    }, 60)
  }

  // ── Monaco mount ────────────────────────────────────────────
  function handleEditorMount(editor, monaco) {
    editorRef.current = editor

    monaco.editor.defineTheme('codesync-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#080b10',
        'editor.foreground': '#c9d1d9',
        'editorCursor.foreground': myColor,
      },
    })

    monaco.editor.setTheme('codesync-dark')
    editor.focus()
  }

  const typingList = Object.values(typingUsers)

  return (
    <div className="h-screen flex flex-col bg-base-950 overflow-hidden animate-fade-in">
      <header className="flex items-center px-4 h-12 border-b border-base-700 glass z-10 flex-shrink-0">

        <div className="flex items-center gap-2 mr-6">
          <span className="font-semibold text-sm text-white hidden sm:block">
            Code<span style={{ color: '#00ffcc' }}>Sync</span>
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-base-800">
          <span className="text-slate-500 text-xs">Room</span>
          <span className="font-mono text-sm font-semibold tracking-widest"
                style={{ color: '#00ffcc' }}>
            {roomId}
          </span>
        </div>

        {/* 🖐 Edit Access Button */}
        <button
          onClick={() => {
            const socket = getSocket()
            if (editOwner === userId) {
              socket.emit('release_edit_access')
            } else {
              socket.emit('request_edit_access')
            }
          }}
          className="ml-3 px-3 py-1.5 rounded-lg text-xs border border-cyan-400/30
                     hover:bg-cyan-400/10 transition-all duration-200"
        >
          🖐 {editOwner === userId ? 'Release' : 'Request Edit'}
        </button>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={onLeave}
            className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-400/20
                       hover:bg-red-400/10 transition-all duration-200"
          >
            Leave
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <Editor
            height="100%"
            language={language}
            defaultValue="// Start coding here..."
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              readOnly: editOwner && editOwner !== userId,   // 👈 IMPORTANT
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>

      <Notifications notifications={notifications} />
    </div>
  )
}