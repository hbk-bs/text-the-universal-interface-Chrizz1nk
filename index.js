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
    
    // Enhanced mood detection with more keywords
    const content = userMessage.content.toLowerCase();
    let mood = 'chill';
    let confidence = 0;
    
    // Happy keywords
    const happyWords = ['happy', 'good', 'great', 'excited', 'awesome', 'fantastic', 'wonderful', 'amazing', 'joy', 'cheerful', 'delighted', 'pleased', 'glad', 'optimistic', 'bright', 'super', 'excellent', 'perfect', 'love', 'loving'];
    const happyCount = happyWords.filter(word => content.includes(word)).length;
    
    // Sad keywords  
    const sadWords = ['sad', 'down', 'depressed', 'unhappy', 'miserable', 'upset', 'crying', 'tears', 'lonely', 'hopeless', 'disappointed', 'hurt', 'pain', 'terrible', 'awful', 'bad', 'worse', 'worst', 'blue', 'gloomy'];
    const sadCount = sadWords.filter(word => content.includes(word)).length;
    
    // Energetic keywords
    const energeticWords = ['energetic', 'pumped', 'active', 'hyper', 'motivated', 'excited', 'ready', 'go', 'action', 'fast', 'quick', 'running', 'workout', 'exercise', 'dance', 'party', 'wild', 'crazy', 'intense'];
    const energeticCount = energeticWords.filter(word => content.includes(word)).length;
    
    // Chill keywords
    const chillWords = ['chill', 'relaxed', 'calm', 'peaceful', 'quiet', 'rest', 'tired', 'sleepy', 'lazy', 'slow', 'ok', 'okay', 'fine', 'normal', 'alright', 'nothing', 'boring', 'meh'];
    const chillCount = chillWords.filter(word => content.includes(word)).length;
    
    // Determine mood based on highest count
    const moodScores = {
        happy: happyCount,
        sad: sadCount,
        energetic: energeticCount,
        chill: chillCount
    };
    
    // Find the mood with highest score
    mood = Object.keys(moodScores).reduce((a, b) => moodScores[a] > moodScores[b] ? a : b);
    
    // If all scores are 0, try to detect mood from sentence structure
    if (Math.max(...Object.values(moodScores)) === 0) {
        if (content.includes('!') || content.includes('wow') || content.includes('yes')) {
            mood = 'happy';
        } else if (content.includes('no') || content.includes('not') || content.includes('never')) {
            mood = 'sad';
        } else if (content.includes('?') && content.includes('do')) {
            mood = 'energetic';
        } else {
            mood = 'chill';
        }
    }

    console.log('Detected mood:', mood, 'Scores:', moodScores, 'Input:', content);

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
        content: 'Hallo! Ich bin dein stimmungsbasierter Assistent. Wie fühlst du dich heute?'
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