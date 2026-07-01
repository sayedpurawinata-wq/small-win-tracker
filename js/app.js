(function () {
  const STORAGE_KEY = 'smallwins'

  const state = {
    currentDate: new Date(),
  }

  const $ = (sel, ctx = document) => ctx.querySelector(sel)
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)]

  const getDateKey = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const isToday = (d) => {
    const t = new Date()
    return d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
  }

  const formatDate = (d) => {
    const opts = { weekday: 'short', month: 'short', day: 'numeric' }
    return d.toLocaleDateString('en-US', opts)
  }

  const loadWins = () => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return all[getDateKey(state.currentDate)] || []
  }

  const persistWins = (wins) => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    all[getDateKey(state.currentDate)] = wins
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  }

  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

  const addWin = (title, emoji) => {
    const wins = loadWins()
    wins.push({
      id: genId(),
      title: title.trim(),
      emoji: emoji.trim() || '🌟',
      done: false,
      createdAt: new Date().toISOString(),
    })
    persistWins(wins)
    render()
  }

  const toggleWin = (id) => {
    const wins = loadWins()
    const w = wins.find(x => x.id === id)
    if (w) {
      w.done = !w.done
      persistWins(wins)
      render()
    }
  }

  const deleteWin = (id) => {
    persistWins(loadWins().filter(x => x.id !== id))
    render()
  }

  const openModal = () => {
    const overlay = $('#modal-overlay')
    overlay.classList.remove('hidden')
    $('#win-title').value = ''
    $('#win-emoji').value = ''
    $('#save-btn').disabled = true
    setTimeout(() => $('#win-title').focus(), 350)
  }

  const closeModal = () => {
    $('#modal-overlay').classList.add('hidden')
  }

  const render = () => {
    const wins = loadWins()
    const list = $('#card-list')
    const display = $('#date-display')
    const nextBtn = $('#next-day')
    const rateText = $('#rate-text')
    const rateFill = $('#rate-fill')

    display.textContent = isToday(state.currentDate) ? 'Today' : formatDate(state.currentDate)
    nextBtn.disabled = isToday(state.currentDate)

    const done = wins.filter(w => w.done).length
    rateText.textContent = wins.length ? `${done}/${wins.length} done` : '0/0 done'
    rateFill.style.width = wins.length ? `${(done / wins.length) * 100}%` : '0%'

    if (wins.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✨</div>
          <p>No small wins yet</p>
          <p class="empty-hint">Tap + to add your first win</p>
        </div>`
      return
    }

    list.innerHTML = wins.map(w => `
      <div class="win-card ${w.done ? 'done' : ''}" data-id="${w.id}">
        <label class="checkbox-wrapper">
          <input type="checkbox" ${w.done ? 'checked' : ''}>
          <span class="checkmark"></span>
        </label>
        <span class="win-emoji">${w.emoji || '🌟'}</span>
        <span class="win-title">${escapeHtml(w.title)}</span>
        <button class="delete-btn" aria-label="Delete win">×</button>
      </div>`).join('')

    $$('.win-card').forEach(card => {
      const id = card.dataset.id
      const cb = card.querySelector('input[type="checkbox"]')
      const del = card.querySelector('.delete-btn')

      cb.addEventListener('change', () => toggleWin(id))
      del.addEventListener('click', (e) => {
        e.stopPropagation()
        deleteWin(id)
      })
    })
  }

  const escapeHtml = (str) => {
    const d = document.createElement('div')
    d.textContent = str
    return d.innerHTML
  }

  const changeDate = (delta) => {
    const d = new Date(state.currentDate)
    d.setDate(d.getDate() + delta)
    if (d > new Date()) return
    state.currentDate = d
    render()
  }

  const init = () => {
    // Date nav
    $('#prev-day').addEventListener('click', () => changeDate(-1))
    $('#next-day').addEventListener('click', () => changeDate(1))

    // FAB
    $('#fab').addEventListener('click', openModal)

    // Modal
    $('#cancel-btn').addEventListener('click', closeModal)
    $('#modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal()
    })

    // Emoji grid
    $$('.emoji-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        $('#win-emoji').value = btn.dataset.emoji
        validateForm()
        $('#win-title').focus()
      })
    })

    // Form validation
    const titleInput = $('#win-title')
    const emojiInput = $('#win-emoji')
    const saveBtn = $('#save-btn')

    const validateForm = () => {
      saveBtn.disabled = titleInput.value.trim().length === 0
    }

    titleInput.addEventListener('input', validateForm)
    emojiInput.addEventListener('input', validateForm)

    // Save
    saveBtn.addEventListener('click', () => {
      const title = titleInput.value.trim()
      if (!title) return
      addWin(title, emojiInput.value.trim())
      closeModal()
    })

    // Keyboard: Enter to save
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !saveBtn.disabled) saveBtn.click()
    })

    // Initial render
    render()

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
    }
  }

  document.addEventListener('DOMContentLoaded', init)
})()
