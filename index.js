let messageHistory = {
    messages: [
        {
            role: 'system',
            content: `
                You are a mood-based assistant. Ask the user how they are feeling.
                Then, analyze their response and respond with:
                1. First line should contain "Mood: [happy/sad/energetic/chill]"
                2. Then provide a thoughtful response about their mood
                3. You need to play the right music. For example: if the user types "happy", play happy_techno.mp3
            `,
        },
    ],
};

// TODO: use your own val.town endpoint
// remix: https://val.town/remix/ff6347-openai-api
const apiEndpoint = 'https://chrizz--455cde100cc54d9da8ef5b40e1b41a04.web.val.run';
if (!apiEndpoint.includes('run')) {
	throw new Error('Please use your own val.town endpoint!!!');
}

const simulateAPI = async (messageHistory) => {
    const userMessage = messageHistory.messages[messageHistory.messages.length - 1];
    const content = userMessage.content.toLowerCase();

    // Wörter zum erkennen der Stimmung
    const moodKeywords = {
        happy: ['happy'],
        sad: ['sad'],
        energetic: ['energetic'],
        chill: ['chill'],
    };

    const moodScores = {};
    for (const mood in moodKeywords) {
        moodScores[mood] = moodKeywords[mood].reduce(
            (count, keyword) => content.includes(keyword) ? count + 1 : count,
            0
        );
    }

    
    console.log("Keyword matches:", moodScores);

    // Wähle den mood mit dem highest match
    let detectedMood = Object.keys(moodScores).reduce((a, b) =>
        moodScores[a] > moodScores[b] ? a : b
    );

    // Handle tie or no match (all zero)
    const maxScore = Math.max(...Object.values(moodScores));
    const tiedMoods = Object.keys(moodScores).filter(m => moodScores[m] === maxScore);

    
    console.log("Final detected mood:", detectedMood);
    // responses von dem ChatBot nach mood calculation
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

// Musik die geladen wird
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

    // Bot gibt ein Intro
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
            // delay für mehr realität
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            const response = await simulateAPI(messageHistory);
            
            // Remove loading message
            messageHistory.messages.pop();
            
            const botMessage = response.completion.choices[0].message;
            messageHistory.messages.push(botMessage);
            messageHistory = truncateHistory(messageHistory);
            chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
            scrollToBottom(chatHistoryElement);

            // erkenne den mood und lade die musik dazu
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

    // Enter button zum Senden der Nachricht
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