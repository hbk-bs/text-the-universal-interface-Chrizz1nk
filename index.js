let messageHistory = {
	response_format: { type: 'json_object' },
	messages: [
		{
			role: 'system',
			content: `
			You are a mood-based assistant. Ask the user how they are feeling.
			Then, analyze their response and respond in the format:
			Mood: [happy/sad/energetic/chill]
			Then ask a follow-up yes/no question.
			`,
		},
	],
};

const apiEndpoint = 'https://www.val.town/x/ff6347/openai_api';
if (!apiEndpoint.includes('run')) {
	throw new Error('Please use your own val.town endpoint!!!');
}

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
	const formElement = document.querySelector('form');
	const audioPlayer = document.getElementById('technoPlayer');
	const audioSource = document.getElementById('audioSource');

	if (!chatHistoryElement || !formElement || !inputElement || !audioPlayer || !audioSource) {
		throw new Error('One or more elements not found.');
	}

	formElement.addEventListener('submit', async (event) => {
		event.preventDefault();

		const formData = new FormData(formElement);
		const content = formData.get('content');
		if (!content) return;

		messageHistory.messages.push({ role: 'user', content });
		messageHistory = truncateHistory(messageHistory);
		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		inputElement.value = '';
		scrollToBottom(chatHistoryElement);

		const response = await fetch(apiEndpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(messageHistory),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(errorText);
		}

		const json = await response.json();
		const botMessage = json.completion.choices[0].message;
		messageHistory.messages.push(botMessage);
		messageHistory = truncateHistory(messageHistory);
		chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
		scrollToBottom(chatHistoryElement);

		// Check for mood
		const moodDetected = botMessage.content.match(/mood:?\s*(happy|sad|energetic|chill)/i);
		if (moodDetected) {
			const mood = moodDetected[1].toLowerCase();
			const song = moodsToSongs[mood];
			if (song) {
				audioSource.src = song;
				audioPlayer.load();
				audioPlayer.hidden = false;
				audioPlayer.play();
			}
		}
	});
});

function addToChatHistoryElement(mhistory) {
	return mhistory.messages
		.map((msg) => (msg.role === 'system' ? '' : `<div class="message ${msg.role}">${msg.content}</div>`))
		.join('');
}

function scrollToBottom(container) {
	container.scrollTop = container.scrollHeight;
}

function truncateHistory(h) {
	const { messages } = h;
	const [system, ...rest] = messages;
	if (rest.length > MAX_HISTORY_LENGTH) {
		return { messages: [system, ...rest.slice(-MAX_HISTORY_LENGTH)] };
	}
	return h;
}
