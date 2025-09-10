const apiUrl = import.meta.env.VITE_API_URL;
class SocketClient {
    constructor() {
        this.socket = null;
        this.userId = localStorage.getItem('userId');
        this.token = localStorage.getItem('token');
    }

    connect() {
        if (!this.token) {
            window.location.href = '/login.html';
            return;
        }

        this.socket = io(`${apiUrl}`, {
            auth: {
                token: this.token
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert(error.message);
        });

        this.socket.on('receive-message', (message) => {
            // Handle incoming message
            if (typeof ChatUI !== 'undefined') {
                window.ChatUI.displayMessage(message);
            }
        });

        // this.socket.on('incoming-call', (callData) => {
        //     // Handle incoming call
        //     console.log("Incoming call data:", callData);
        //     if (typeof CallUI !== 'undefined') {
        //         console.log("Displaying incoming call UI");
                
        //         CallUI.showIncomingCall(callData);
        //     }
        // });
        this.socket.on('incoming-call', (callData) => {
            // Handle incoming call
            console.log("Incoming call data:", callData);
            if (typeof CallManager !== 'undefined') {
                console.log("Displaying incoming call UI");
                window.CallManager.handleIncomingCall(callData);
                //CallUI.showIncomingCall(callData);
                
            }
        });

        this.socket.on('call-accepted', (callData) => {
            // Handle call accepted
            if (typeof CallUI !== 'undefined') {
                CallUI.handleCallAccepted(callData);
            }
        });

        this.socket.on('call-rejected', (callData) => {
            // Handle call rejected
            if (typeof CallUI !== 'undefined') {
                CallUI.handleCallRejected(callData);
            }
        });

        this.socket.on('webrtc-signaling', (data) => {
            // Handle WebRTC signaling
            if (typeof CallManager !== 'undefined') {
                CallManager.handleSignalingData(data);
            }
        });

        this.socket.on('user-typing', (data) => {
            // Handle typing indicator
            if (typeof ChatUI !== 'undefined') {
                window.ChatUI.showTypingIndicator(data);
            }
        });

        this.socket.on('message-read', (data) => {
            // Handle message read receipt
            if (typeof ChatUI !== 'undefined') {
                window.ChatUI.updateMessageStatus(data.messageId, 'read');
            }
        });

        this.socket.on('user-online', (data) => {
            // Handle user online status
            if (typeof ContactManager !== 'undefined') {
                ContactManager.updateUserStatus(data.userId, true);
            }
        });

        this.socket.on('user-offline', (data) => {
            // Handle user offline status
            if (typeof ContactManager !== 'undefined') {
                ContactManager.updateUserStatus(data.userId, false);
            }
        });
    }

    sendMessage(messageData) {
        console.log("came to emiting");

        this.socket.emit('send-message', messageData);
    }

    initiateCall(callData) {
        console.log("Initiating call:", callData);
        this.socket.emit('initiate-call', callData);
    }

    acceptCall(callData) {
        this.socket.emit('accept-call', callData);
    }

    rejectCall(callData) {
        this.socket.emit('reject-call', callData);
    }

    sendSignalingData(data) {
        this.socket.emit('webrtc-signaling', data);
    }

    startTyping(data) {
        this.socket.emit('typing-start', data);
    }

    stopTyping(data) {
        this.socket.emit('typing-stop', data);
    }

    markAsRead(messageId) {
        this.socket.emit('mark-as-read', { messageId });
    }
}

const socketClient = new SocketClient();