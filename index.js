let messageHistory = {
    messages: [
        {
            role: 'system',
            content: `
                You are a mood-based assistant. Ask the user how they are feeling.
                Then, analyze their response and respond with:
                1. First line should contain "Mood: [happy/sad/energetic/chill]"
                2. Then provide a thoughtful response about their mood
                3. Then ask a follow-up yes/no question.
            `,
        },
    ],
};

const simulateAPI = async (messageHistory) => {
    const userMessage = messageHistory.messages[messageHistory.messages.length - 1];
    const content = userMessage.content.toLowerCase();

    // Keyword lists
    const moodKeywords = {
        happy: ['happy', 'good', 'great', 'awesome', 'fantastic', 'joy', 'smile', 'excited', 'lovely'],
        sad: ['sad', 'down', 'unhappy', 'cry', 'depressed', 'lonely', 'bad', 'miserable', 'tears'],
        energetic: ['energetic', 'pumped', 'excited', 'hyper', 'active', 'motivated', 'fast', 'party'],
        chill: ['chill', 'relaxed', 'calm', 'peaceful', 'meh', 'fine', 'okay', 'tired', 'lazy'],
    };

    const moodScores = {};
    for (const mood in moodKeywords) {
        moodScores[mood] = moodKeywords[mood].reduce(
            (count, keyword) => content.includes(keyword) ? count + 1 : count,
            0
        );
    }

    // Logging
    console.log("Keyword matches:", moodScores);

    // Determine mood by highest match
    let detectedMood = Object.keys(moodScores).reduce((a, b) =>
        moodScores[a] > moodScores[b] ? a : b
    );

    // Handle tie or no match (all zero)
    const maxScore = Math.max(...Object.values(moodScores));
    const tiedMoods = Object.keys(moodScores).filter(m => moodScores[m] === maxScore);

    if (maxScore === 0) {
        // No keyword match – fallback logic
        if (content.includes('!') || content.includes('love') || content.includes('yes')) {
            detectedMood = 'happy';
        } else if (content.includes('no') || content.includes('not') || content.includes('tired')) {
            detectedMood = 'sad';
        } else if (content.includes('go') || content.includes('now') || content.includes('do')) {
            detectedMood = 'energetic';
        } else {
            detectedMood = 'chill';
        }
    } else if (tiedMoods.length > 1) {
        // Randomly choose one of the top-scoring moods
        detectedMood = tiedMoods[Math.floor(Math.random() * tiedMoods.length)];
    }

    console.log("Final detected mood:", detectedMood);

    const responses = {
        happy: "Mood: happy\n\nThat's wonderful! It's great to hear you're feeling positive today. 😊\n\nWould you like to share what's making you feel so good?",
        sad: "Mood: sad\n\nI'm sorry to hear you're feeling down. It's okay to feel that way. 💙\n\nWould you like to talk about it?",
        energetic: "Mood: energetic\n\nWoo! You're full of energy today! ⚡\n\nDo you have something exciting planned?",
        chill: "Mood: chill\n\nTaking it easy, huh? Nice and mellow. 😌\n\nDo you want to keep it low-key today?",
    };

    return {
        completion: {
            choices: [{
                message: {
                    role: 'assistant',
                    content: responses[detectedMood]
                }
            }]
        }
    };
};


const MAX_HISTORY_LENGTH = 10;

const moodsToSongs = {
    happy: 'music/happy_techno.mp3',
    sad: 'music/sad_techno.mp3', 
    energetic: 'music/energetic_techno.mp3',
    chill: 'music/chill_techno.mp3',
};

document.addEventListener('DOMContentLoaded', () => {
    const chatHistoryElement = document.querySelector('.chat-history');
    const inputElement = document.querySelector('input');
    const formElement = document.getElementById('chatForm');
    const audioPlayer = document.getElementById('technoPlayer');
    const audioSource = document.getElementById('audioSource');

    if (!chatHistoryElement || !formElement || !inputElement || !audioPlayer || !audioSource) {
        console.error('One or more elements not found.');
        return;
    }

    // Add initial greeting
    const initialMessage = {
        role: 'assistant',
        content: 'HI! Im your mood-based assistant. How are you feeling today? Please share your thoughts, and I will support you with some beats.'
    };
    messageHistory.messages.push(initialMessage);
    chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);

    formElement.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        const formData = new FormData(formElement);
        const content = formData.get('content');
        
        if (!content || content.trim() === '') return;

        // Add user message
        messageHistory.messages.push({ role: 'user', content: content.trim() });
        messageHistory = truncateHistory(messageHistory);
        chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
        inputElement.value = '';
        scrollToBottom(chatHistoryElement);

        // Add loading indicator
        const loadingMessage = { role: 'assistant', content: 'Typing...', loading: true };
        messageHistory.messages.push(loadingMessage);
        chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
        scrollToBottom(chatHistoryElement);

        try {
            // Simulate delay for more realistic feel
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            const response = await simulateAPI(messageHistory);
            
            // Remove loading message
            messageHistory.messages.pop();
            
            const botMessage = response.completion.choices[0].message;
            messageHistory.messages.push(botMessage);
            messageHistory = truncateHistory(messageHistory);
            chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
            scrollToBottom(chatHistoryElement);

            // Check for mood and play appropriate sound
           const moodMatch = botMessage.content.match(/mood[:\-]?\s*(happy|sad|energetic|chill)/i);

            if (moodMatch) {
                const mood = moodMatch[1].toLowerCase();
                const song = moodsToSongs[mood];
                if (song) {
                    audioSource.src = song;
                    audioPlayer.load();
                    audioPlayer.style.display = 'block';
                    try {
                        await audioPlayer.play();
                    } catch (playError) {
                        console.log('Audio autoplay blocked:', playError);
                    }
                }
            }
        } catch (error) {
            // Remove loading message
            messageHistory.messages.pop();
            
            const errorMessage = {
                role: 'assistant',
                content: 'Entschuldigung, es gab einen Fehler beim Verarbeiten deiner Nachricht. Bitte versuche es erneut.'
            };
            messageHistory.messages.push(errorMessage);
            chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
            scrollToBottom(chatHistoryElement);
            console.error('Error:', error);
        }
    });

    // Allow Enter key to submit
    inputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const submitEvent = new Event('submit', {
                bubbles: true,
                cancelable: true
            });
            formElement.dispatchEvent(submitEvent);
        }
    });
});

function addToChatHistoryElement(mhistory) {
    return mhistory.messages
        .map((msg) => {
            if (msg.role === 'system') return '';
            const loadingClass = msg.loading ? ' loading' : '';
            return `<div class="message ${msg.role}${loadingClass}">${msg.content.replace(/\n/g, '<br>')}</div>`;
        })
        .join('');
}

function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}

function truncateHistory(h) {
    const { messages } = h;
    const [system, ...rest] = messages;
    if (rest.length > MAX_HISTORY_LENGTH) {
        return { 
            messages: [system, ...rest.slice(-MAX_HISTORY_LENGTH)]
        };
    }
    return h;
}