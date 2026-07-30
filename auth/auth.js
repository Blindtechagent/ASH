// Firebase Auth and Realtime Database logic
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');

    // Helper to get root path
    const getRoot = () => {
        const path = window.location.pathname;
        if (path.includes('/auth/') || path.includes('/materials/') || path.includes('/menu/')) return '../';
        return '';
    };
    const root = getRoot();

    // Announcement Function
    function announce(message, type = "info") {
        const box = document.getElementById('announcement');
        if (!box) return;
        
        box.textContent = message;
        box.style.display = 'block';
        
        // Custom styling for types
        if (type === "error") {
            box.style.backgroundColor = "#721c24";
            box.style.color = "#f8d7da";
        } else if (type === "success") {
            box.style.backgroundColor = "#155724";
            box.style.color = "#d4edda";
        } else {
            box.style.backgroundColor = "#0c5460";
            box.style.color = "#d1ecf1";
        }

        setTimeout(() => {
            box.style.display = 'none';
        }, 5000);
    }

    // Show Password Logic
    const showPasswordToggle = document.getElementById('show-password');
    const passwordInput = document.getElementById('password');
    if (showPasswordToggle && passwordInput) {
        showPasswordToggle.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    }

    // Signup Logic
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            if (password.length < 6) {
                announce("Password should be at least 6 characters long.", "error");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Creating Account...";
            announce("Creating your account...", "info");

            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return user.updateProfile({ displayName: name }).then(() => {
                        return firebase.database().ref('users/' + user.uid).set({
                            displayName: name, 
                            email: email, 
                            role: role,
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    });
                })
                .then(() => {
                    announce("Account created successfully!", "success");
                    setTimeout(() => {
                        window.location.href = role === 'publisher' ? 'publisher-panel.html' : root + 'index.html';
                    }, 1500);
                })
                .catch((error) => {
                    announce("Signup Error: " + error.message, "error");
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Sign Up";
                });
        });
    }

    // Login Logic
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            submitBtn.disabled = true;
            submitBtn.textContent = "Logging in...";
            announce("Signing you in...", "info");

            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return firebase.database().ref('users/' + user.uid).once('value');
                })
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        localStorage.setItem('userRole', userData.role);
                        announce("Logged in successfully!", "success");
                        setTimeout(() => {
                            window.location.href = userData.role === 'publisher' ? 'publisher-panel.html' : root + 'index.html';
                        }, 1000);
                    } else {
                        announce("User record not found. Please contact support.", "error");
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Login";
                    }
                })
                .catch((error) => {
                    let msg = error.message;
                    if (error.code === 'auth/user-not-found') {
                        msg = "No account found with this email. Redirecting to signup...";
                        setTimeout(() => window.location.href = 'signup.html', 3000);
                    }
                    announce("Login Error: " + msg, "error");
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Login";
                });
        });
    }

    // Google Sign-In Logic
    const googleBtn = document.getElementById('google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            const provider = new firebase.auth.GoogleAuthProvider();
            const roleSelect = document.getElementById('role');
            const selectedRole = roleSelect ? roleSelect.value : 'reader';

            announce("Opening Google Sign-In...", "info");

            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;
                    return firebase.database().ref('users/' + user.uid).once('value').then((snapshot) => {
                        if (!snapshot.exists()) {
                            return firebase.database().ref('users/' + user.uid).set({
                                displayName: user.displayName, 
                                email: user.email, 
                                role: selectedRole,
                                createdAt: firebase.database.ServerValue.TIMESTAMP
                            }).then(() => selectedRole);
                        }
                        return snapshot.val().role;
                    });
                })
                .then((role) => {
                    localStorage.setItem('userRole', role);
                    announce("Logged in with Google!", "success");
                    setTimeout(() => {
                        window.location.href = role === 'publisher' ? 'publisher-panel.html' : root + 'index.html';
                    }, 1000);
                })
                .catch((error) => announce("Google Auth Error: " + error.message, "error"));
        });
    }

    // Forgot Password Logic
    const forgotPasswordLink = document.getElementById('forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            let email = document.getElementById('email').value;
            if (!email) {
                email = prompt("Please enter your email address to reset password:");
                if (!email) return;
                document.getElementById('email').value = email;
            }
            
            announce("Sending reset email...", "info");
            firebase.auth().sendPasswordResetEmail(email)
                .then(() => announce("Password reset email sent! Check your inbox.", "success"))
                .catch((error) => announce("Error: " + error.message, "error"));
        });
    }

    // Logout Function
    window.logout = function() {
        firebase.auth().signOut().then(() => {
            localStorage.removeItem('userRole');
            window.location.href = root + 'auth/login.html';
        });
    };

    // Helper to get time-based greeting
    function getGreeting(name) {
        const hour = new Date().getHours();
        if (hour < 12) return `Good morning, ${name}!`;
        if (hour < 17) return `Good afternoon, ${name}!`;
        if (hour < 21) return `Good evening, ${name}!`;
        return `Good night, ${name}!`;
    }

    // Auth Observer
    firebase.auth().onAuthStateChanged((user) => {
        const loginLinks = document.querySelectorAll('.login-link');
        const signupLinks = document.querySelectorAll('.signup-link');
        const logoutBtns = document.querySelectorAll('.logout-btn');
        const publisherLinks = document.querySelectorAll('.publisher-link');
        const manageAccountLinks = document.querySelectorAll('.manage-account-link');
        const greetingSection = document.getElementById('greeting-section');
        const greetUser = document.getElementById('greet-user');

        if (user) {
            loginLinks.forEach(el => el.style.display = 'none');
            signupLinks.forEach(el => el.style.display = 'none');
            logoutBtns.forEach(el => el.style.display = 'block');
            manageAccountLinks.forEach(el => el.style.display = 'block');
            
            firebase.database().ref('users/' + user.uid).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const role = data.role;
                    publisherLinks.forEach(el => el.style.display = role === 'publisher' ? 'block' : 'none');
                    
                    if (greetingSection && greetUser) {
                        greetingSection.style.display = 'block';
                        greetUser.textContent = getGreeting(data.displayName || 'User');
                    }
                }
            });
        } else {
            logoutBtns.forEach(el => el.style.display = 'none');
            manageAccountLinks.forEach(el => el.style.display = 'none');
            loginLinks.forEach(el => el.style.display = 'block');
            signupLinks.forEach(el => el.style.display = 'block');
            publisherLinks.forEach(el => el.style.display = 'none');
            if (greetingSection) greetingSection.style.display = 'none';
        }
    });
});
