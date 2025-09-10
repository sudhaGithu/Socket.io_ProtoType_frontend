const apiUrl = import.meta.env.VITE_API_URL;
class ChatUI {
    constructor() {
        this.currentChat = null;
        this.isGroupChat = false;
        this.setupEventListeners();
        this.loadUserData();
        this.loadContacts();
        this.loadGroups();
    }
    
    setupEventListeners() {
        // Send message button
        document.getElementById('send-message-btn').addEventListener('click', () => {
            console.log("message calling");
            
            this.sendMessage();
        });
        
        // Message input enter key
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Typing indicators
        const messageInput = document.getElementById('message-input');
        let typingTimeout;
        
        messageInput.addEventListener('input', () => {
            if (this.currentChat) {
                socketClient.startTyping({
                    receiverId: this.isGroupChat ? null : this.currentChat.id,
                    groupId: this.isGroupChat ? this.currentChat.id : null
                });
                
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    socketClient.stopTyping({
                        receiverId: this.isGroupChat ? null : this.currentChat.id,
                        groupId: this.isGroupChat ? this.currentChat.id : null
                    });
                }, 1000);
            }
        });
    }
    
    loadUserData() {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) {
            document.getElementById('user-avatar').src = userData.profilePicture || 'default-avatar.png';
            document.getElementById('username').textContent = userData.username;
        }
    }
    
    async loadContacts() {
        try {
            const response = await fetch(`${apiUrl}/api/auth/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
            const data = await response.json();
            const contacts = data.users || [];   // ✅ Extract array
            this.renderContacts(contacts);
        }
        } catch (error) {
            console.error('Failed to load contacts:', error);
        }
    }
    
    async loadGroups() {
        try {
            const response = await fetch(`${apiUrl}/api/chat/groups`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
            const data = await response.json();
            const groups = data.data?.groups || [];   // ✅ Extract array safely
            this.renderGroups(groups);
        }
        } catch (error) {
            console.error('Failed to load groups:', error);
        }
    }
    
    renderContacts(contacts) {
        const contactsList = document.getElementById('contacts-list');
        contactsList.innerHTML = '';
        
        contacts.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.className = 'contact-item';
            contactElement.innerHTML = `
                <img src="${contact.profilePicture || 'default-avatar.png'}" alt="${contact.username}">
                <div class="contact-info">
                    <div class="contact-name">${contact.username}</div>
                    <div class="contact-status" id="status-${contact._id}">Offline</div>
                </div>
            `;
            
            contactElement.addEventListener('click', () => {
                this.selectChat(contact, false);
            });
            
            contactsList.appendChild(contactElement);
        });
    }
    
    renderGroups(groups) {
        const groupsList = document.getElementById('groups-list');
        groupsList.innerHTML = '';
        
        groups.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'group-item';
            groupElement.innerHTML = `
                <img src="${group.groupPicture || 'default-group.png'}" alt="${group.name}">
                <div class="group-info">
                    <div class="group-name">${group.name}</div>
                    <div class="group-members">${group.participants.length} members</div>
                </div>
            `;
            
            groupElement.addEventListener('click', () => {
                this.selectChat(group, true);
            });
            
            groupsList.appendChild(groupElement);
        });
    }
    
    async selectChat(chatData, isGroup) {
        this.currentChat = chatData;
        this.isGroupChat = isGroup;
        
        // Update chat header
        document.getElementById('chat-avatar').src = isGroup ? 
            (chatData.groupPicture || 'default-group.png') : 
            (chatData.profilePicture || 'default-avatar.png');
        
        document.getElementById('chat-name').textContent = isGroup ? 
            chatData.name : chatData.username;
        
        document.getElementById('chat-status').textContent = isGroup ? 
            `${chatData.participants.length} members` : 'Online';
        
        // Load messages
        await this.loadMessages();
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    async loadMessages() {
        try {
            const url = this.isGroupChat ? 
                `${apiUrl}/api/chat/messages?groupId=${this.currentChat._id}` :
                `${apiUrl}/api/chat/messages?receiverId=${this.currentChat._id}`;
            console.log("Loading messages from:", url);
            console.log("currentchat",this.currentChat._id);
            
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
            const data = await response.json();
            console.log("Messages API response:", data); // 👀 Debug
            const messages = data.messages || data.data?.messages || []; // ✅ Safe extract
            this.renderMessages(messages);
        }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }
    
    renderMessages(messages) {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = '';
        console.log(messages);
        
        messages.forEach(message => {
            this.displayMessage(message);
        });
    }
    
    displayMessage(message) {
        // Only display if it belongs to the current chat
        if (this.currentChat && 
            ((this.isGroupChat && message.group === this.currentChat._id) ||
            (!this.isGroupChat && 
             (message.sender._id === this.currentChat._id || message.receiver === this.currentChat._id)))) {
            
            const messagesContainer = document.getElementById('messages-container');
            const messageElement = document.createElement('div');
            
            const isSent = message.sender._id === localStorage.getItem('userId');
            messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
            
            const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            messageElement.innerHTML = `
                <div class="message-content">
                    ${this.isGroupChat && !isSent ? `<div class="message-sender">${message.sender.username}</div>` : ''}
                    <div class="message-text">${message.content}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;
            
            messagesContainer.appendChild(messageElement);
            this.scrollToBottom();
            
            // Mark as read if it's a received message
            if (!isSent && !message.readBy.includes(localStorage.getItem('userId'))) {
                socketClient.markAsRead(message._id);
            }
        }
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        
        console.log("hiii", messageInput);
        
        if (content && this.currentChat) {
            const messageData = {
                content,
                messageType: 'text'
            };
            
            if (this.isGroupChat) {
                messageData.groupId = this.currentChat._id;
            } else {
                messageData.receiverId = this.currentChat._id;
            }

           console.log("Sending message:", messageData);
            socketClient.sendMessage(messageData);
            messageInput.value = '';
        }
    }
    
    showTypingIndicator(data) {
        // Only show if it's for the current chat
        if (this.currentChat && 
            ((this.isGroupChat && data.groupId === this.currentChat.id) ||
            (!this.isGroupChat && data.userId === this.currentChat.id))) {
            
            // Implement typing indicator UI
            console.log(`${data.username} is typing...`);
        }
    }
    
    updateMessageStatus(messageId, status) {
        // Update message status in UI (e.g., single tick to double tick)
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            // Update status indicator
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    socketClient.connect();
    window.ChatUI = new ChatUI();
});