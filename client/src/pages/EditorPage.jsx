/**
 * EditorPage - full-screen collaborative code editor
 */
import { useRef, useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useSocket } from '../hooks/useSocket'
import { useAutoSave } from '../hooks/useAutoSave'
import UserList from '../components/UserList'
import Notifications, { useNotifications } from '../components/Notifications'

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'rust', 'go',
  'cpp', 'java', 'html', 'css', 'json', 'markdown',
]

export default function EditorPage({ user, onLeave }) {
  const { userId, username, roomId } = user
  const editorRef = useRef(null)
  const contentRef = useRef('') // latest content for auto-save
  const debounceRef = useRef(null)
  const [language, setLanguage] = useState('javascript')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [editorFocused, setEditorFocused] = useState(false)
  const { notifications, addNotification } = useNotifications()

  // ── Handle incoming code updates ────────────────────────────
  const handleCodeUpdate = useCallback((newContent, isInitial) => {
    if (!editorRef.current) return
    const editor = editorRef.current
    const model = editor.getModel()
    if (!model) return

    if (isInitial) {
      // Full replace for initial load (no undo history needed)
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
  const { activeUsers, typingUsers, myColor, emitCodeChange, emitTyping } = useSocket({
    roomId, userId, username,
    onCodeUpdate: handleCodeUpdate,
    onNotification: addNotification,
  })

  // ── Auto-save every 5s ──────────────────────────────────────
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
      }, 60) // 60ms debounce
    }

  // ── Monaco mount ────────────────────────────────────────────
  function handleEditorMount(editor, monaco) {
    editorRef.current = editor

    // Custom theme
    monaco.editor.defineTheme('codesync-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '3d5266', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'bf5fff' },
        { token: 'string', foreground: '00ffcc' },
        { token: 'number', foreground: 'ffd93d' },
        { token: 'type', foreground: '4d96ff' },
        { token: 'function', foreground: '6bcb77' },
      ],
      colors: {
        'editor.background': '#080b10',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b2280',
        'editor.selectionBackground': '#00ffcc22',
        'editor.inactiveSelectionBackground': '#00ffcc11',
        'editorLineNumber.foreground': '#30363d',
        'editorLineNumber.activeForeground': '#00ffcc88',
        'editorCursor.foreground': myColor,
        'editorGutter.background': '#080b10',
        'editorWidget.background': '#0d1117',
        'input.background': '#161b22',
        'focusBorder': '#00ffcc44',
        'scrollbar.shadow': '#00000000',
        'scrollbarSlider.background': '#30363d55',
        'scrollbarSlider.hoverBackground': '#30363daa',
      },
    })
    monaco.editor.setTheme('codesync-dark')

    editor.focus()
  }

  const typingList = Object.values(typingUsers)

  return (
    <div className="h-screen flex flex-col bg-base-950 overflow-hidden animate-fade-in">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="flex items-center px-4 h-12 border-b border-base-700 glass z-10 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #00ffcc, #06b6d4)' }}>
            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-white hidden sm:block">
            Code<span style={{ color: '#00ffcc' }}>Sync</span>
          </span>
        </div>

        {/* Room ID */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-base-800">
          <span className="text-slate-500 text-xs">Room</span>
          <span className="font-mono text-sm font-semibold tracking-widest"
                style={{ color: '#00ffcc' }}>
            {roomId}
          </span>
        </div>

        {/* Language Selector */}
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="ml-3 bg-base-800 text-slate-300 text-xs border border-base-600
                     rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-glow
                     cursor-pointer transition-colors hover:border-slate-500"
        >
          {LANGUAGES.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        {/* Typing indicator in header */}
        {typingList.length > 0 && (
          <div className="ml-4 flex items-center gap-2 text-xs text-slate-400 animate-fade-in">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i}
                      className="inline-block w-1 h-1 rounded-full animate-typing-dot"
                      style={{ background: '#00ffcc', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span>
              {typingList.slice(0, 2).join(', ')}
              {typingList.length > 2 && ` +${typingList.length - 2}`} typing
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* User count pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
               style={{ background: 'rgba(0,255,204,0.1)', color: '#00ffcc' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {activeUsers.length} online
          </div>

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-base-700
                       transition-all duration-200"
            title="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Leave */}
          <button
            onClick={onLeave}
            className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-400/20
                       hover:bg-red-400/10 transition-all duration-200"
          >
            Leave
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Monaco Editor ──────────────────────────────────── */}
        <div
          className="flex-1 overflow-hidden relative transition-all duration-300"
          onFocus={() => setEditorFocused(true)}
          onBlur={() => setEditorFocused(false)}
        >
          {/* Animated glow border on active editor */}
          <div
            className="absolute inset-0 pointer-events-none z-10 rounded-sm transition-all duration-500"
            style={{
              boxShadow: editorFocused
                ? 'inset 0 0 0 1px rgba(0,255,204,0.3), 0 0 30px rgba(0,255,204,0.08)'
                : 'inset 0 0 0 1px transparent',
            }}
          />

          <Editor
            height="100%"
            language={language}
            defaultValue="// Start coding here..."
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            loading={
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Loading editor...
              </div>
            }
            options={{
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderLineHighlight: 'line',
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              padding: { top: 16, bottom: 16 },
              wordWrap: 'off',
              tabSize: 2,
              formatOnType: false,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              bracketPairColorization: { enabled: true },
            }}
          />
        </div>

        {/* ── Sidebar ───────────────────────────────────────── */}
        <div
          className="border-l border-base-700 glass overflow-hidden transition-all duration-300 flex-shrink-0"
          style={{ width: sidebarOpen ? '220px' : '0px' }}
        >
          {sidebarOpen && (
            <div className="w-[220px] h-full animate-slide-in-right">
              <UserList
                users={activeUsers}
                typingUsers={typingUsers}
                myUserId={userId}
                roomId={roomId}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Notifications ─────────────────────────────────── */}
      <Notifications notifications={notifications} />
    </div>
  )
}
