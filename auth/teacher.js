// Teacher Panel Logic with Realtime Database

// Converts any Google Drive shareable link to a direct download link
function convertToDirectDownload(url) {
    if (!url) return url;

    // Pattern 1: https://drive.google.com/file/d/FILE_ID/view...
    let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }

    // Pattern 2: https://drive.google.com/open?id=FILE_ID
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }

    // Return original if not a recognizable Google Drive link
    return url;
}

// Toggle guide card open/close
function toggleGuide() {
    const guide = document.getElementById('drive-guide');
    const arrow = document.getElementById('guide-arrow');
    const toggle = document.getElementById('guide-toggle');
    if (!guide) return;
    const isOpen = guide.style.display !== 'none';
    guide.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.innerHTML = isOpen ? '&#9660;' : '&#9650;';
    if (toggle) toggle.setAttribute('aria-expanded', String(!isOpen));
}

document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const categorySelect = document.getElementById('file-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields');
    const typeSpecificFields = document.getElementById('type-specific-fields');
    const mainContent = document.getElementById('main-content');

    // Hide content until auth + role check completes — prevents unauthorized interaction
    if (mainContent) mainContent.style.visibility = 'hidden';

    // Announcement helper — uses #announcement div instead of alert()
    function announce(message, type = 'info') {
        const box = document.getElementById('announcement');
        if (!box) return;
        box.textContent = message;
        box.style.display = 'block';
        if (type === 'error') {
            box.style.backgroundColor = '#721c24';
            box.style.color = '#f8d7da';
        } else if (type === 'success') {
            box.style.backgroundColor = '#155724';
            box.style.color = '#d4edda';
        } else {
            box.style.backgroundColor = '#0c5460';
            box.style.color = '#d1ecf1';
        }
        setTimeout(() => { box.style.display = 'none'; }, 5000);
    }

    // Auth + role guard
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            firebase.database().ref('users/' + user.uid).once('value').then(snapshot => {
                if (snapshot.exists() && snapshot.val().role === 'teacher') {
                    // Authorized — reveal the page
                    if (mainContent) mainContent.style.visibility = 'visible';
                    loadTeacherUploads(user.uid);

                    // Live preview: convert URL as teacher pastes/types
                    const urlInput = document.getElementById('file-url');
                    const preview = document.getElementById('converted-url-preview');
                    if (urlInput && preview) {
                        urlInput.addEventListener('input', function() {
                            const val = this.value.trim();
                            if (!val) { preview.style.display = 'none'; return; }
                            const converted = convertToDirectDownload(val);
                            if (converted !== val) {
                                preview.textContent = '✓ Will save as: ' + converted;
                                preview.style.display = 'block';
                            } else {
                                preview.textContent = '⚠ Unrecognized Google Drive link format. Will save as-is.';
                                preview.style.color = '#ffcc00';
                                preview.style.display = 'block';
                            }
                        });
                    }

                } else {
                    announce('Unauthorized access. Redirecting...', 'error');
                    setTimeout(() => { window.location.href = '../index.html'; }, 2000);
                }
            }).catch(() => {
                announce('Failed to verify role. Redirecting...', 'error');
                setTimeout(() => { window.location.href = '../index.html'; }, 2000);
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
            if (!user) return announce('Login required.', 'error');

            const category = categorySelect.value;
            const subject = document.getElementById('file-subject').value.trim();
            const classLevel = document.getElementById('file-class').value;
            const driveUrl = convertToDirectDownload(document.getElementById('file-url').value.trim());
            const materialName = document.getElementById('file-name').value.trim();

            if (!materialName) return announce('Please enter a material name.', 'error');

            const sizeInput = document.getElementById('file-size');
            const formatInput = document.getElementById('file-format');
            const yearInput = document.getElementById('file-year');

            const fileSize = sizeInput ? sizeInput.value + ' MB' : 'N/A';
            const fileFormat = formatInput ? formatInput.value : '.pdf';
            const extraInfo = yearInput ? ` (${yearInput.value})` : '';

            // Use the teacher-provided name as the title
            const title = materialName + extraInfo;

            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';

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
                announce('Uploaded successfully!', 'success');
                uploadForm.reset();
                dynamicFieldsContainer.style.display = 'none';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload Material';
                loadTeacherUploads(user.uid);
            }).catch(err => {
                announce('Upload error: ' + err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload Material';
            });
        });
    }

    function loadTeacherUploads(uid) {
        const container = document.getElementById('teacher-uploads');
        if (!container) return;

        container.innerHTML = '<p>Loading your uploads...</p>';

        // Traverse the nested structure: materials -> category -> class -> subject -> file
        firebase.database().ref('materials').once('value').then((snapshot) => {
            container.innerHTML = '';
            if (!snapshot.exists()) {
                container.innerHTML = '<p>No uploads found.</p>';
                return;
            }

            const items = [];
            snapshot.forEach(catSnap => {
                catSnap.forEach(classSnap => {
                    classSnap.forEach(subjectSnap => {
                        subjectSnap.forEach(fileSnap => {
                            const data = fileSnap.val();
                            if (data && data.authorUid === uid) {
                                // Build a clean, structured path — no URL parsing needed
                                const dbPath = `materials/${catSnap.key}/${classSnap.key}/${subjectSnap.key}/${fileSnap.key}`;
                                items.push({ id: fileSnap.key, dbPath, ...data });
                            }
                        });
                    });
                });
            });

            if (items.length === 0) {
                container.innerHTML = '<p>No uploads found.</p>';
                return;
            }

            items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            let html = '<table class="w3-table w3-bordered ash-border-yellow"><thead><tr class="ash-text-yellow"><th>Title</th><th>Class</th><th>Subject</th><th>Actions</th></tr></thead><tbody>';
            items.forEach((item) => {
                // Escape dbPath to safely embed in HTML attribute
                const safePath = item.dbPath.replace(/'/g, "\\'");
                html += `<tr><td>${item.title}</td><td>${item.class}</td><td>${item.subject}</td><td><button onclick="deleteMaterial('${safePath}')" class="ash-button w3-small">Delete</button></td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        }).catch(err => {
            container.innerHTML = `<p>Error loading uploads: ${err.message}</p>`;
        });
    }

    window.deleteMaterial = function(dbPath) {
        if (!confirm('Are you sure you want to delete this material? This cannot be undone.')) return;
        firebase.database().ref(dbPath).remove()
            .then(() => {
                announce('Material deleted successfully.', 'success');
                const user = firebase.auth().currentUser;
                if (user) loadTeacherUploads(user.uid);
            })
            .catch(err => announce('Delete error: ' + err.message, 'error'));
    };
});
