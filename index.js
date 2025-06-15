// Configuration
const API_ENDPOINT = 'https://chrizz--455cde100cc54d9da8ef5b40e1b41a04.web.val.run';
const MAX_HISTORY_LENGTH = 10;

// Mood to music mapping
const moodsToSongs = {
    happy: 'music/happy_techno.mp3',
    sad: 'music/sad_techno.mp3',
    energetic: ['music/energetic_techno.mp3', 'music/hard_techno.mp3'],
    chill: ['music/chill_techno.mp3', 'music/chill1_techno.mp3', 'music/chill2_techno.mp3']
};



const moodEmojis = {
    happy: '😊',
    sad: '😢',
    energetic: '⚡',
    chill: '😌'
};

// Message history
let messageHistory = {
    messages: [
        {
            role: 'system',
            content: `Du bist ein freundlicher Techno-Musik-Assistant. 
            
            Wenn jemand ein Mood (happy, sad, energetic, chill) wählt oder erwähnt, reagiere darauf und erkläre, welche Art von Techno-Musik zu dieser Stimmung passt.
            
            Du kannst auch normale Gespräche führen und auf Fragen antworten. Sei freundlich, enthusiastisch über Musik und hilfsbereit.
            Gib kurze freundliche Antworten und versuche, die Stimmung des Nutzers zu erkennen.
            
            Die verfügbaren Moods sind:
            - happy: Fröhliche, uplifting Techno-Beats
            - sad: Melancholische, emotionale Techno-Klänge  
            - energetic: Kraftvolle, intensive Techno-Tracks (auch Hard Techno)
            - chill: Entspannte, ambient Techno-Musik`
        }
    ]
};

let currentMood = null;

// DOM Elements
const chatHistoryElement = document.querySelector('.chat-history');
const inputElement = document.querySelector('input[name="content"]');
const formElement = document.getElementById('chatForm');
const audioPlayer = document.getElementById('technoPlayer');
const audioSource = document.getElementById('audioSource');
const moodButtons = document.querySelectorAll('.mood-btn');
const currentMoodIndicator = document.querySelector('.current-mood .mood-indicator');
const audioPlayerContainer = document.querySelector('.audio-player');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add welcome message
    const welcomeMessage = {
        role: 'assistant',
        content: '🎵 Hallo! Ich bin dein Techno-Mood-Assistant! Wähle dein aktuelles Mood mit den Emojis aus und ich spiele dir passende Musik dazu. Du kannst auch einfach mit mir chatten!'
    };
    
    messageHistory.messages.push(welcomeMessage);
    updateChatHistory();
    
    // Setup event listeners
    setupMoodButtons();
    setupForm();
    setupKeypress();
});

function setupMoodButtons() {
    moodButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const mood = e.target.dataset.mood;
            selectMood(mood);
        });
    });
}

function selectMood(mood) {
    currentMood = mood;
    
    // Update button states
    moodButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-mood="${mood}"]`).classList.add('active');
    
    // Update mood indicator
    currentMoodIndicator.textContent = moodEmojis[mood];
    
    // Add mood selection as user message and let AI respond
    const moodMessage = {
        role: 'user',
        content: `Ich fühle mich gerade ${mood}. Spiel mir passende Musik dazu!`
    };
    
    messageHistory.messages.push(moodMessage);
    messageHistory = truncateHistory(messageHistory);
    updateChatHistory();
    
    // Play corresponding music immediately
    playMoodMusic(mood);
    
    // Let AI respond to the mood
    sendToAI();
}

function playMoodMusic(mood) {
    let song = moodsToSongs[mood];
    
    // If mood has multiple songs (array), pick one randomly
    if (Array.isArray(song)) {
        const randomIndex = Math.floor(Math.random() * song.length);
        song = song[randomIndex];
        console.log(`Playing random ${mood} track: ${song}`);
    }
    
    if (song) {
        audioSource.src = song;
        audioPlayer.load();
        audioPlayerContainer.style.display = 'block';
        
        // Try to play (might be blocked by browser)
        audioPlayer.play().catch(error => {
            console.log('Autoplay blocked:', error);
        });
    }
}

function setupForm() {
    formElement.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const content = inputElement.value.trim();
        if (!content) return;
        
        // Add user message
        const userMessage = { role: 'user', content };
        messageHistory.messages.push(userMessage);
        messageHistory = truncateHistory(messageHistory);
        updateChatHistory();
        
        inputElement.value = '';
        
        // Send to AI
        await sendToAI();
    });
}

async function sendToAI() {
    // Add loading message
    const loadingMessage = { role: 'assistant', content: 'Schreibe...', loading: true };
    messageHistory.messages.push(loadingMessage);
    updateChatHistory();
    
    try {
        // Call API
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messageHistory.messages.filter(m => !m.loading) }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove loading message
        messageHistory.messages.pop();
        
        // Add AI response
        const botMessage = data.completion?.choices?.[0]?.message || {
            role: 'assistant',
            content: 'Entschuldigung, ich konnte keine Antwort generieren.'
        };
        
        messageHistory.messages.push(botMessage);
        messageHistory = truncateHistory(messageHistory);
        updateChatHistory();
        
        // Check if mood was detected in response and play music
        detectAndPlayMoodMusic(botMessage.content);
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Remove loading message
        messageHistory.messages.pop();
        
        // Add error message
        const errorMessage = {
            role: 'assistant',
            content: 'Entschuldigung, es gab einen Fehler beim Verarbeiten deiner Nachricht. Bitte versuche es erneut.'
        };
        
        messageHistory.messages.push(errorMessage);
        updateChatHistory();
    }
}

function setupKeypress() {
    inputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            formElement.dispatchEvent(new Event('submit'));
        }
    });
}

function detectAndPlayMoodMusic(content) {
    const moodMatch = content.toLowerCase().match(/\b(happy|sad|energetic|chill)\b/);
    if (moodMatch) {
        const detectedMood = moodMatch[1];
        playMoodMusic(detectedMood);
    }
}

function updateChatHistory() {
    chatHistoryElement.innerHTML = messageHistory.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => {
            const loadingClass = msg.loading ? ' loading' : '';
            return `<div class="message ${msg.role}${loadingClass}">${msg.content.replace(/\n/g, '<br>')}</div>`;
        })
        .join('');
    
    scrollToBottom(chatHistoryElement);
}

function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}

function truncateHistory(history) {
    const { messages } = history;
    const [system, ...rest] = messages;
    
    if (rest.length > MAX_HISTORY_LENGTH) {
        return {
            messages: [system, ...rest.slice(-MAX_HISTORY_LENGTH)]
        };
    }
    
    return history;
}