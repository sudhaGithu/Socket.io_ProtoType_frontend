class CallManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.isCaller = false;

        this.setupPeerConnection();
        this.setupEventListeners();
    }

    setupPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
                this.remoteStream = event.streams[0];
            }
        };

        // Handle ICE candidates
        // this.peerConnection.onicecandidate = (event) => {
        //     if (event.candidate) {
        //         socketClient.sendSignalingData({
        //             targetUserId: this.currentCall.caller === localStorage.getItem('userId') ?
        //                 this.currentCall.receiver : this.currentCall.caller,
        //             signal: {
        //                 type: 'ice-candidate',
        //                 candidate: event.candidate
        //             }
        //         });
        //     }
        // };
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.currentCall) {
                const targetUserId = this.currentCall.caller === localStorage.getItem('userId')
                    ? this.currentCall.receiver
                    : this.currentCall.caller;

                socketClient.sendSignalingData({
                    targetUserId,
                    signal: {
                        type: 'ice-candidate',
                        candidate: event.candidate
                    }
                });
            }
        };

    }

    setupEventListeners() {
        // Audio call button
        document.getElementById('audio-call-btn').addEventListener('click', () => {
            console.log("Audio call button clicked");

            if (window.chatUI && window.chatUI.currentChat) {
                console.log("currentChat:", window.chatUI.currentChat);
                this.initiateCall('audio');
            }
        });

        // Video call button
        document.getElementById('video-call-btn').addEventListener('click', () => {
            console.log("Video call button clicked");

            if (window.chatUI && window.chatUI.currentChat) {
                console.log("currentChat:", window.chatUI.currentChat);
                this.initiateCall('video');
            }
        });


        // Accept call button
        document.getElementById('accept-call-btn').addEventListener('click', () => {
            this.acceptCall();
        });

        // Reject call button
        document.getElementById('reject-call-btn').addEventListener('click', () => {
            this.rejectCall();
        });

        // End call button
        document.getElementById('end-call-btn').addEventListener('click', () => {
            this.endCall();
        });
    }

    // async initiateCall(callType) {
    //     try {
    //         this.isCaller = true;

    //         // Get local media
    //         const constraints = {
    //             audio: true,
    //             video: callType === 'video'
    //         };

    //         this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

    //         // Display local video
    //         const localVideo = document.getElementById('local-video');
    //         if (localVideo) {
    //             localVideo.srcObject = this.localStream;
    //         }

    //         // Add local stream to peer connection
    //         this.localStream.getTracks().forEach(track => {
    //             this.peerConnection.addTrack(track, this.localStream);
    //         });

    //         // Create offer
    //         const offer = await this.peerConnection.createOffer();
    //         await this.peerConnection.setLocalDescription(offer);

    //         // Send call initiation to server
    //         const callData = {
    //             callType,
    //             isGroupCall: window.chatUI.isGroupChat,
    //             receiverId: window.chatUI.isGroupChat ? null : window.chatUI.currentChat._id,
    //             groupId: window.chatUI.isGroupChat ? window.chatUI.currentChat._id : null
    //         };


    //         socketClient.initiateCall(callData);

    //     } catch (error) {
    //         console.error('Error initiating call:', error);
    //         alert('Failed to start call. Please check your camera and microphone permissions.');
    //     }
    // }

    async initiateCall(callType) {
        try {
            this.isCaller = true;

            const constraints = {
                audio: true,
                video: callType === 'video'
            };
            console.log(callType, constraints);


            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }

            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // Send call initiation to server
            const callData = {
                callType,
                offer,  // ✅ include this!
                isGroupCall: window.chatUI.isGroupChat,
                receiverId: window.chatUI.isGroupChat ? null : window.chatUI.currentChat._id,
                groupId: window.chatUI.isGroupChat ? window.chatUI.currentChat._id : null,
                caller: { _id: localStorage.getItem("userId") } // ✅ include caller info too
            };

            socketClient.initiateCall(callData);

        } catch (error) {
            console.error('Error initiating call:', error);
            alert('Failed to start call. Please check your camera and microphone permissions.');
        }
    }


    async handleIncomingCall(callData) {
        console.log("Call data received:", callData);
        this.currentCall = callData;
        console.log("Current call data:", this.currentCall);
        this.isCaller = false;





        // Show call interface
        CallUI.showIncomingCall(callData);
    }

    // async acceptCall() {
    //     try {
    //         if (!this.currentCall) {
    //             console.error("❌ No call data available to accept!");
    //             alert("No incoming call to accept.");
    //             return;
    //         }

    //         console.log("📞 Accepting call:", this.currentCall);

    //         const constraints = {
    //             audio: true,
    //             video: this.currentCall.callType === 'video'
    //         };

    //         this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

    //         const localVideo = document.getElementById('local-video');
    //         if (localVideo) {
    //             localVideo.srcObject = this.localStream;
    //         }

    //         this.localStream.getTracks().forEach(track => {
    //             this.peerConnection.addTrack(track, this.localStream);
    //         });

    //         // Ensure the caller's offer exists
    //         if (!this.currentCall.offer) {
    //             console.error("❌ Missing offer in callData:", this.currentCall);
    //             alert("Call cannot be accepted — missing offer.");
    //             return;
    //         }

    //         await this.peerConnection.setRemoteDescription(this.currentCall.offer);

    //         const answer = await this.peerConnection.createAnswer();
    //         await this.peerConnection.setLocalDescription(answer);

    //         socketClient.sendSignalingData({
    //             targetUserId: this.currentCall.caller._id || this.currentCall.caller,
    //             signal: {
    //                 type: 'answer',
    //                 answer: answer
    //             }
    //         });

    //         socketClient.acceptCall({ callId: this.currentCall._id });

    //         CallUI.showOngoingCall();

    //     } catch (error) {
    //         console.error('Error accepting call:', error);
    //         alert('Failed to accept call.');
    //     }
    // }

    async acceptCall() {
        try {
            console.log("Accepting call:", this.currentCall);

            // ✅ If we already have localStream, don’t ask again
            if (!this.localStream) {
                const constraints = {
                    audio: true,
                    video: this.currentCall.callType === 'video'
                };
                this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            // Display local video
            const localVideo = document.getElementById('local-video');
            if (localVideo && this.localStream) {
                localVideo.srcObject = this.localStream;
            }

            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Set remote description from offer
            await this.peerConnection.setRemoteDescription(this.currentCall.offer);

            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Send answer to caller
            socketClient.sendSignalingData({
                targetUserId: this.currentCall.caller._id || this.currentCall.caller, // support object or id
                signal: {
                    type: 'answer',
                    answer: answer
                }
            });

            // Notify server that call was accepted
            socketClient.acceptCall({ callId: this.currentCall._id });

            // Update UI to show ongoing call
            CallUI.showOngoingCall();

        } catch (error) {
            console.error('Error accepting call:', error);
            alert('Failed to accept call. Please check mic/camera permissions.');
        }
    }


    async handleSignalingData(data) {
        try {
            if (data.signal.type === 'offer' && !this.isCaller) {
                await this.peerConnection.setRemoteDescription(data.signal.offer);

                // Create answer
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);

                // Send answer back
                socketClient.sendSignalingData({
                    targetUserId: data.fromUserId,
                    signal: {
                        type: 'answer',
                        answer: answer
                    }
                });

            } else if (data.signal.type === 'answer' && this.isCaller) {
                await this.peerConnection.setRemoteDescription(data.signal.answer);

            } else if (data.signal.type === 'ice-candidate') {
                await this.peerConnection.addIceCandidate(data.signal.candidate);
            }
        } catch (error) {
            console.error('Error handling signaling data:', error);
        }
    }

    rejectCall() {
        if (this.currentCall) {
            socketClient.rejectCall({ callId: this.currentCall._id });
            CallUI.hideCallInterface();
            this.cleanupCall();
        }
    }

    endCall() {
        if (this.currentCall) {
            // Notify server that call ended
            fetch(`/api/call/end/${this.currentCall._id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            // Notify other participant
            const targetUserId = this.isCaller ?
                (this.currentCall.receiver || this.currentCall.group) :
                this.currentCall.caller;

            socketClient.sendSignalingData({
                targetUserId,
                signal: { type: 'end-call' }
            });

            CallUI.hideCallInterface();
            this.cleanupCall();
        }
    }

    cleanupCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.setupPeerConnection(); // Reset peer connection
        }

        this.currentCall = null;
    }
}

class CallUI {
    static showIncomingCall(callData) {
        const callInterface = document.getElementById('call-interface');
        const callStatus = document.getElementById('call-status');
        const callerInfo = document.getElementById('caller-info');
        const acceptBtn = document.getElementById('accept-call-btn');
        const rejectBtn = document.getElementById('reject-call-btn');
        const endBtn = document.getElementById('end-call-btn');

        callStatus.textContent = `Incoming ${callData.callType} call`;
        callerInfo.textContent = `From: ${callData.caller.username}`;

        acceptBtn.style.display = 'inline-block';
        rejectBtn.style.display = 'inline-block';
        endBtn.style.display = 'none';

        callInterface.style.display = 'flex';
    }

    static showOngoingCall() {
        const callStatus = document.getElementById('call-status');
        const acceptBtn = document.getElementById('accept-call-btn');
        const rejectBtn = document.getElementById('reject-call-btn');
        const endBtn = document.getElementById('end-call-btn');

        callStatus.textContent = 'Call in progress';

        acceptBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
        endBtn.style.display = 'inline-block';
    }

    static hideCallInterface() {
        const callInterface = document.getElementById('call-interface');
        callInterface.style.display = 'none';
    }

    static handleCallAccepted(callData) {
        // Update UI when call is accepted by receiver
        this.showOngoingCall();
    }

    static handleCallRejected(callData) {
        // Update UI when call is rejected
        const callStatus = document.getElementById('call-status');
        callStatus.textContent = 'Call rejected';

        setTimeout(() => {
            this.hideCallInterface();
        }, 2000);
    }
}

// Initialize call manager
window.CallManager = new CallManager();
window.CallUI = CallUI;

//Make sure to handle incoming calls
socketClient.socket.on('incoming-call', (callData) => {
    console.log("📥 Incoming call:", callData);
    CallManager.handleIncomingCall(callData);
});