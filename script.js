// Title: ProChat JavaScript Logic
// Description: Manages the ProChat AI assistant with chat history, sidebar control, and message interactions.

// Element References
const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const sidebar = document.getElementById("sidebar");
const chatList = document.getElementById("chat-list");
const menuBtn = document.getElementById("menu-btn");
const closeSidebar = document.getElementById("close-sidebar");
const themeToggle = document.getElementById("theme-toggle");
const shareBtn = document.getElementById("share-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const searchChat = document.getElementById("search-chat");

// API Configuration
const API_KEY = "AIzaSyAlOazVdBzeebrjvw_HClXTk5aoEDE7dxw"; // Replace this!
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Global Variables
let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
let currentChatId = null;

// Toggle Sidebar
function toggleSidebar() {
    sidebar.classList.toggle("active");
}

// Hide Sidebar on Outside Click
document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
    }
});

// Sidebar Controls
menuBtn.addEventListener("click", toggleSidebar);
closeSidebar.addEventListener("click", toggleSidebar);

// Theme Toggle
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});

// Load Saved Theme
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

// Add Message to Chatbox
function addMessage(message, isUser = false, chatId = currentChatId) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat", isUser ? "outgoing" : "incoming");
    messageDiv.innerHTML = isUser
        ? `<p>${message}</p><div class="chat-actions">
             <span class="material-icons edit-msg">edit</span>
             <span class="material-icons copy-msg">content_copy</span>
           </div>`
        : `<span class="material-icons">smart_toy</span><p>${message}</p>`;
    chatbox.appendChild(messageDiv);
    chatbox.scrollTop = chatbox.scrollHeight;

    if (chatId) {
        const chat = chatHistory.find(c => c.id === chatId);
        chat.messages.push({ text: message, isUser });
        localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    }
}

// Load Chat History
function loadChatHistory(filter = "") {
    chatList.innerHTML = "";
    const filteredChats = chatHistory.filter(chat => 
        chat.title.toLowerCase().includes(filter.toLowerCase())
    );
    filteredChats.forEach(chat => {
        const chatItem = document.createElement("div");
        chatItem.classList.add("chat-item");
        chatItem.innerHTML = `
            <span>${chat.title}</span>
            <div>
                <span class="material-icons rename-chat" data-id="${chat.id}">edit</span>
                <span class="material-icons delete-chat" data-id="${chat.id}">delete</span>
            </div>`;
        chatItem.addEventListener("click", (e) => {
            if (!e.target.classList.contains("material-icons")) {
                loadChat(chat.id);
            }
        });
        chatList.appendChild(chatItem);
    });
}

// Load a Specific Chat
function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chatHistory.find(c => c.id === chatId);
    chatbox.innerHTML = "";
    chat.messages.forEach(msg => addMessage(msg.text, msg.isUser, null));
    toggleSidebar();
}

// Create New Chat
function createNewChat(message = "New Chat") {
    const chatId = Date.now().toString();
    const title = message.slice(0, 20) + (message.length > 20 ? "..." : "");
    chatHistory.push({ id: chatId, title, messages: [] });
    currentChatId = chatId;
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    loadChatHistory();
    loadChat(chatId);
}

// New Chat Button
newChatBtn.addEventListener("click", () => {
    createNewChat();
});

// Search Chats
searchChat.addEventListener("input", (e) => {
    loadChatHistory(e.target.value);
});

// Fetch Gemini Response
async function getGeminiResponse(message) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }]
            })
        });
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        const data = await response.json();
        if (!data.candidates || !data.candidates[0]) throw new Error("No response from API");
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error:", error);
        return "Sorry, something went wrong! Please check your API key or try again later.";
    }
}

// Send Message
sendBtn.addEventListener("click", async () => {
    const message = userInput.value.trim();
    if (!message) return;

    if (!currentChatId) createNewChat(message);

    addMessage(message, true);
    userInput.value = "";
    // No height adjustment needed; CSS will handle fixed size

    addMessage("Typing...");
    const botResponse = await getGeminiResponse(message);
    chatbox.lastChild.remove();
    addMessage(botResponse, false);
    loadChatHistory();
});

// Enter Key to Send
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

// Edit and Copy Messages
chatbox.addEventListener("click", async (e) => {
    if (e.target.classList.contains("edit-msg")) {
        const messageDiv = e.target.parentElement.parentElement;
        const p = messageDiv.querySelector("p");
        const newText = prompt("Edit your message:", p.textContent);
        if (newText !== null && newText.trim() !== "") {
            p.textContent = newText;
            const chat = chatHistory.find(c => c.id === currentChatId);
            const msgIndex = Array.from(chatbox.children).indexOf(messageDiv);
            chat.messages[msgIndex].text = newText;
            localStorage.setItem("chatHistory", JSON.stringify(chatHistory));

            if (msgIndex + 1 < chatbox.children.length && !chatbox.children[msgIndex + 1].classList.contains("outgoing")) {
                chatbox.children[msgIndex + 1].remove();
                chat.messages.splice(msgIndex + 1, 1);
            }

            addMessage("Typing...");
            const botResponse = await getGeminiResponse(newText);
            chatbox.lastChild.remove();
            addMessage(botResponse, false);
            loadChatHistory();
        }
    } else if (e.target.classList.contains("copy-msg")) {
        const p = e.target.parentElement.previousElementSibling;
        navigator.clipboard.writeText(p.textContent);
        alert("Message copied to clipboard!");
    }
});

// Rename and Delete Chats
chatList.addEventListener("click", (e) => {
    const chatId = e.target.dataset.id;
    if (e.target.classList.contains("rename-chat")) {
        const newTitle = prompt("Enter new chat title:");
        if (newTitle !== null && newTitle.trim() !== "") {
            const chat = chatHistory.find(c => c.id === chatId);
            chat.title = newTitle;
            localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
            loadChatHistory();
        }
    } else if (e.target.classList.contains("delete-chat")) {
        if (confirm("Are you sure you want to delete this chat?")) {
            chatHistory = chatHistory.filter(c => c.id !== chatId);
            localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
            loadChatHistory();
            if (currentChatId === chatId) {
                chatbox.innerHTML = '<div class="chat incoming"><span class="material-icons">smart_toy</span><p>Hello! I\'m ProChat, your AI assistant. How can I help you today?</p></div>';
                currentChatId = null;
            }
        }
    }
});

// Share Chat
shareBtn.addEventListener("click", () => {
    if (!currentChatId) return alert("No chat to share!");
    const chat = chatHistory.find(c => c.id === currentChatId);
    const text = chat.messages.map(m => `${m.isUser ? "You" : "Bot"}: ${m.text}`).join("\n");
    navigator.clipboard.writeText(text);
    alert("Chat copied to clipboard!");
});

// Initial Load
loadChatHistory();