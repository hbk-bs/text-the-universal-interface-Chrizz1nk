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

// Simulate API since the original endpoint won't work
const simulateAPI = async (messageHistory) => {
    const userMessage = messageHistory.messages[messageHistory.messages.length - 1];
    
    // Simple mood detection based on keywords
    const content = userMessage.content.toLowerCase();
    let mood = 'chill';
    
    if (content.includes('happy') || content.includes('good') || content.includes('great') || content.includes('excited')) {
        mood = 'happy';
    } else if (content.includes('sad') || content.includes('down') || content.includes('depressed') || content.includes('bad')) {
        mood = 'sad';
    } else if (content.includes('energetic') || content.includes('pumped') || content.includes('active') || content.includes('hyper')) {
        mood = 'energetic';
    }

    const responses = {
        happy: "Mood: happy\n\nThat's wonderful! It's great to hear you're feeling positive today. Happiness can be contagious and really brightens up the day.\n\nWould you like to share what's making you feel so good today?",
        sad: "Mood: sad\n\nI'm sorry to hear you're feeling down. It's completely normal to have difficult days, and it's okay to acknowledge these feelings.\n\nWould you like to talk about what's been troubling you?",
        energetic: "Mood: energetic\n\nThat's fantastic! Having lots of energy can be really motivating and help you accomplish great things today.\n\nDo you have any exciting plans to channel that energy into?",
        chill: "Mood: chill\n\nSounds like you're in a relaxed state of mind. Sometimes taking things easy and going with the flow is exactly what we need.\n\nAre you planning to keep this laid-back vibe for the rest of the day?"
    };

    return {
        completion: {
            choices: [{
                message: {
                    role: 'assistant',
                    content: responses[mood]
                }
            }]
        }
    };
};

const MAX_HISTORY_LENGTH = 10;

const moodsToSongs = {
    happy: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    sad: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', 
    energetic: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    chill: 'https://cdn.freesound.org/previews/316/316847_1676145-lq.mp3',
};

document.addEventListener('DOMContentLoaded', () => {
    const chatHistoryElement = document.querySelector('.chat-history');
    const inputElement = document.querySelector('input');
    const formElement = document.querySelector('form');
    const audioPlayer = document.getElementById('technoPlayer');
    const audioSource = document.getElementById('audioSource');

    if (!chatHistoryElement || !formElement || !inputElement || !audioPlayer || !audioSource) {
        console.error('One or more elements not found.');
        return;
    }

    // Add initial greeting
    const initialMessage = {
        role: 'assistant',
        content: 'Hallo! Ich bin dein stimmungsbasierter Assistent. Wie fühlst du dich heute?'
    };
    messageHistory.messages.push(initialMessage);
    chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);

    formElement.addEventListener('submit', async (event) => {
        event.preventDefault();
        
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
            const moodMatch = botMessage.content.match(/mood:?\s*(happy|sad|energetic|chill)/i);
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
            formElement.dispatchEvent(new Event('submit'));
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