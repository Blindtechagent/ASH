// Teacher Panel Logic with Realtime Database
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const categorySelect = document.getElementById('file-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields');
    const typeSpecificFields = document.getElementById('type-specific-fields');
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            firebase.database().ref('users/' + user.uid).once('value').then(snapshot => {
                if (snapshot.exists() && snapshot.val().role === 'teacher') {
                    loadTeacherUploads(user.uid);
                } else {
                    alert("Unauthorized access. Redirecting...");
                    window.location.href = '../index.html';
                }
            });
        } else {
            window.location.href = 'login.html';
        }
    });

    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            const category = this.value;
            if (category) {
                dynamicFieldsContainer.style.display = 'block';
                renderSpecificFields(category);
            } else {
                dynamicFieldsContainer.style.display = 'none';
            }
        });
    }

    function renderSpecificFields(category) {
        typeSpecificFields.innerHTML = '';
        let html = '';

        if (category === 'books') {
            html = `
                <div class="w3-half w3-margin-bottom">
                    <label for="file-size">File Size (in MB)</label>
                    <input type="number" id="file-size" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. 5" step="0.1" required>
                </div>
                <div class="w3-half w3-margin-bottom">
                    <label for="file-format">Book Type</label>
                    <select id="file-format" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                        <option value="" disabled selected>Select Format</option>
                        <option value=".pdf">.pdf</option>
                        <option value=".epub">.epub</option>
                    </select>
                </div>
            `;
        } else if (category === 'sample-papers') {
            html = `
                <div class="w3-half w3-margin-bottom">
                    <label for="file-year">Exam Year</label>
                    <input type="number" id="file-year" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. 2024" required>
                </div>
                <div class="w3-half w3-margin-bottom">
                    <label for="file-format">File Format</label>
                    <select id="file-format" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                        <option value=".pdf">.pdf</option>
                        <option value=".docx">.docx</option>
                    </select>
                </div>
            `;
        } else {
            // Notes and Practice
            html = `
                <div class="w3-full w3-margin-bottom">
                    <label for="file-format">File Format</label>
                    <select id="file-format" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                        <option value=".pdf">.pdf</option>
                        <option value=".docx">.docx</option>
                        <option value=".zip">.zip</option>
                    </select>
                </div>
            `;
        }
        typeSpecificFields.innerHTML = html;
    }

    if (uploadForm) {
        uploadForm.addEventListener('reset', function() {
            dynamicFieldsContainer.style.display = 'none';
        });

        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const user = firebase.auth().currentUser;
            if (!user) return alert("Login required.");

            const category = categorySelect.value;
            const subject = document.getElementById('file-subject').value.trim();
            const classLevel = document.getElementById('file-class').value;
            const driveUrl = document.getElementById('file-url').value;

            // Generate title automatically
            let categoryLabel = 'Material';
            if (category === 'books') categoryLabel = 'Book';
            else if (category === 'notes') categoryLabel = 'Notes';
            else if (category === 'practice') categoryLabel = 'Practice Questions';
            else if (category === 'sample-papers') categoryLabel = 'Sample Paper';

            const title = `${subject} ${categoryLabel}`;

            const sizeInput = document.getElementById('file-size');
            const formatInput = document.getElementById('file-format');
            const yearInput = document.getElementById('file-year');

            const fileSize = sizeInput ? sizeInput.value + ' MB' : 'N/A';
            const fileFormat = formatInput ? formatInput.value : '.pdf';
            const extraInfo = yearInput ? ` (${yearInput.value})` : '';

            const materialRef = firebase.database().ref(`materials/${category}/${classLevel}/${subject}`).push();
            materialRef.set({
                title: title + extraInfo, 
                category, 
                subject, 
                class: classLevel,
                size: fileSize,
                format: fileFormat,
                downloadUrl: driveUrl, 
                authorUid: user.uid,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                alert("Uploaded Successfully!");
                uploadForm.reset();
                dynamicFieldsContainer.style.display = 'none';
                loadTeacherUploads(user.uid);
            }).catch(err => alert("Error: " + err.message));
        });
    }

    function loadTeacherUploads(uid) {
        const container = document.getElementById('teacher-uploads');
        if (!container) return;

        // Since we are now using a nested structure, we need to fetch the whole category or use a different indexing strategy.
        // For simplicity in the teacher panel "Your Uploads" view, we'll fetch the materials and filter them.
        firebase.database().ref('materials').once('value').then((snapshot) => {
            container.innerHTML = '';
            if (!snapshot.exists()) {
                container.innerHTML = '<p>No uploads found.</p>';
                return;
            }

            const items = [];
            // Traverse the nested structure: materials -> category -> class -> subject -> file
            snapshot.forEach(catSnap => {
                catSnap.forEach(classSnap => {
                    classSnap.forEach(subjectSnap => {
                        subjectSnap.forEach(fileSnap => {
                            const data = fileSnap.val();
                            if (data.authorUid === uid) {
                                items.push({ id: fileSnap.key, path: fileSnap.ref.toString(), ...data });
                            }
                        });
                    });
                });
            });

            if (items.length === 0) {
                container.innerHTML = '<p>No uploads found.</p>';
                return;
            }
            
            items.sort((a, b) => b.createdAt - a.createdAt);

            let html = '<table class="w3-table w3-bordered ash-border-yellow"><thead><tr class="ash-text-yellow"><th>Title</th><th>Class</th><th>Subject</th><th>Actions</th></tr></thead><tbody>';
            items.forEach((item) => {
                // Get the relative path for deletion
                const relativePath = item.path.split('.app/')[1];
                html += `<tr><td>${item.title}</td><td>${item.class}</td><td>${item.subject}</td><td><button onclick="deleteMaterial('${relativePath}')" class="ash-button w3-small">Delete</button></td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        });
    }

    window.deleteMaterial = function(path) {
        if (confirm("Delete this?")) {
            firebase.database().ref(path).remove()
                .then(() => {
                    alert("Deleted.");
                    const user = firebase.auth().currentUser;
                    if (user) loadTeacherUploads(user.uid);
                });
        }
    };
});
