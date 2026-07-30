// Publisher Panel Logic with Realtime Database

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
    const categoryFieldsContainer = document.getElementById('category-fields-container');
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
                if (snapshot.exists() && snapshot.val().role === 'publisher') {
                    // Authorized — reveal the page
                    if (mainContent) mainContent.style.visibility = 'visible';
                    loadPublisherUploads(user.uid);

                    // Live preview: convert URL as publisher pastes/types
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
                renderCategoryFields(category);
            } else {
                dynamicFieldsContainer.style.display = 'none';
            }
        });
    }

    function renderCategoryFields(category) {
        categoryFieldsContainer.innerHTML = '';
        let html = '';

        if (category === 'books') {
            html = `
                <div class="w3-row-padding" style="padding:0;">
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-class">Class</label>
                        <select id="file-class" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                            <option value="" disabled selected>Select Class</option>
                            <option value="6">Class 6</option>
                            <option value="7">Class 7</option>
                            <option value="8">Class 8</option>
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                            <option value="11">Class 11</option>
                            <option value="12">Class 12</option>
                        </select>
                    </div>
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-subject">Subject</label>
                        <input type="text" id="file-subject" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. Mathematics" required>
                    </div>
                </div>
                <div class="w3-margin-bottom">
                    <label for="file-name">Book Name</label>
                    <input type="text" id="file-name" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. NCERT Mathematics Part 1" required>
                </div>
                <div class="w3-row-padding" style="padding:0;">
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-format">Book Type (Format)</label>
                        <select id="file-format" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                            <option value="" disabled selected>Select Format</option>
                            <option value=".pdf">.pdf</option>
                            <option value=".epub">.epub</option>
                        </select>
                    </div>
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-size">File Size</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="number" id="file-size" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. 5" step="0.1" style="flex: 2;" required>
                            <select id="file-size-unit" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" style="flex: 1;" required>
                                <option value="MB" selected>MB</option>
                                <option value="KB">KB</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
            categoryFieldsContainer.innerHTML = html;
        } else if (category === 'notes') {
            html = `
                <div class="w3-row-padding" style="padding:0;">
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-class">Class</label>
                        <select id="file-class" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                            <option value="" disabled selected>Select Class</option>
                            <option value="6">Class 6</option>
                            <option value="7">Class 7</option>
                            <option value="8">Class 8</option>
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                            <option value="11">Class 11</option>
                            <option value="12">Class 12</option>
                        </select>
                    </div>
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-subject">Subject</label>
                        <input type="text" id="file-subject" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. Science" required>
                    </div>
                </div>
                <div class="w3-margin-bottom">
                    <label for="notes-is-chapter">Is this from a specific chapter?</label>
                    <select id="notes-is-chapter" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                        <option value="no" selected>No</option>
                        <option value="yes">Yes</option>
                    </select>
                </div>
                <div class="w3-margin-bottom">
                    <label for="file-name" id="notes-title-label">Title of the Notes</label>
                    <input type="text" id="file-name" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. Complete Chemistry Notes" required>
                </div>
                <div class="w3-margin-bottom">
                    <label for="file-format">File Format</label>
                    <select id="file-format" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                        <option value="" disabled selected>Select Format</option>
                        <option value=".pdf">.pdf</option>
                        <option value=".docx">.docx</option>
                        <option value=".zip">.zip</option>
                    </select>
                </div>
            `;
            categoryFieldsContainer.innerHTML = html;

            const isChapterSelect = document.getElementById('notes-is-chapter');
            const notesTitleLabel = document.getElementById('notes-title-label');
            const notesTitleInput = document.getElementById('file-name');
            if (isChapterSelect && notesTitleLabel && notesTitleInput) {
                isChapterSelect.addEventListener('change', function() {
                    if (this.value === 'yes') {
                        notesTitleLabel.textContent = 'Chapter Name';
                        notesTitleInput.placeholder = 'e.g. Chapter 1: Chemical Reactions';
                    } else {
                        notesTitleLabel.textContent = 'Title of the Notes';
                        notesTitleInput.placeholder = 'e.g. Complete Chemistry Notes';
                    }
                });
            }
        } else if (category === 'practice') {
            html = `
                <div class="w3-row-padding" style="padding:0;">
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-class">Class</label>
                        <select id="file-class" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                            <option value="" disabled selected>Select Class</option>
                            <option value="6">Class 6</option>
                            <option value="7">Class 7</option>
                            <option value="8">Class 8</option>
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                            <option value="11">Class 11</option>
                            <option value="12">Class 12</option>
                        </select>
                    </div>
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-subject">Subject</label>
                        <input type="text" id="file-subject" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. Mathematics" required>
                    </div>
                </div>
                <div class="w3-margin-bottom">
                    <label for="file-name">Practice Set Name / Topic</label>
                    <input type="text" id="file-name" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. NCERT Chapter 1 Practice Set" required>
                </div>
                <div class="w3-margin-bottom">
                    <label for="file-format">File Format</label>
                    <select id="file-format" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                        <option value="" disabled selected>Select Format</option>
                        <option value=".pdf">.pdf</option>
                        <option value=".docx">.docx</option>
                        <option value=".zip">.zip</option>
                    </select>
                </div>
            `;
            categoryFieldsContainer.innerHTML = html;
        } else if (category === 'sample-papers') {
            html = `
                <div class="w3-row-padding" style="padding:0;">
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-class">Class</label>
                        <select id="file-class" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                            <option value="" disabled selected>Select Class</option>
                            <option value="6">Class 6</option>
                            <option value="7">Class 7</option>
                            <option value="8">Class 8</option>
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                            <option value="11">Class 11</option>
                            <option value="12">Class 12</option>
                        </select>
                    </div>
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-subject">Subject</label>
                        <input type="text" id="file-subject" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. Science" required>
                    </div>
                </div>
                <div class="w3-margin-bottom">
                    <label for="file-name">Exam / Board Name</label>
                    <input type="text" id="file-name" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. CBSE Term 1 Board Paper" required>
                </div>
                <div class="w3-row-padding" style="padding:0;">
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-year">Exam Year</label>
                        <input type="number" id="file-year" class="w3-input ash-bg-black ash-text-yellow ash-border-yellow" placeholder="e.g. 2024" required>
                    </div>
                    <div class="w3-half w3-margin-bottom">
                        <label for="file-format">File Format</label>
                        <select id="file-format" class="w3-select ash-bg-black ash-text-yellow ash-border-yellow" required>
                            <option value="" disabled selected>Select Format</option>
                            <option value=".pdf">.pdf</option>
                            <option value=".docx">.docx</option>
                        </select>
                    </div>
                </div>
            `;
            categoryFieldsContainer.innerHTML = html;
        }
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
            const sizeUnitInput = document.getElementById('file-size-unit');
            const formatInput = document.getElementById('file-format');
            const yearInput = document.getElementById('file-year');

            const fileSize = sizeInput ? sizeInput.value + ' ' + (sizeUnitInput ? sizeUnitInput.value : 'MB') : 'N/A';
            const fileFormat = formatInput ? formatInput.value : '.pdf';
            const extraInfo = yearInput ? ` (${yearInput.value})` : '';

            // Use the publisher-provided name as the title
            const title = materialName + extraInfo;

            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';

            const materialRef = firebase.database().ref(`materials/${category}/${classLevel}/${subject}`).push();
            materialRef.set({
                title: title,
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
                loadPublisherUploads(user.uid);
            }).catch(err => {
                announce('Upload error: ' + err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload Material';
            });
        });
    }

    function loadPublisherUploads(uid) {
        const container = document.getElementById('publisher-uploads');
        if (!container) return;

        container.innerHTML = '<p>Loading your uploads...</p>';

        // Traverse the nested structure: materials -> category -> class -> subject -> file
        firebase.database().ref('materials').once('value').then((snapshot) => {
            container.innerHTML = '';
            if (!snapshot.exists()) {
                container.innerHTML = '<p>No uploads found.</p>';
                return;
            }

            // Group items: class -> subject -> array of files
            const grouped = {};
            let totalUploads = 0;

            snapshot.forEach(catSnap => {
                catSnap.forEach(classSnap => {
                    const classLevel = classSnap.key;
                    classSnap.forEach(subjectSnap => {
                        const subName = subjectSnap.key;
                        subjectSnap.forEach(fileSnap => {
                            const fileData = fileSnap.val();
                            if (fileData && fileData.authorUid === uid) {
                                const dbPath = `materials/${catSnap.key}/${classLevel}/${subName}/${fileSnap.key}`;
                                
                                if (!grouped[classLevel]) {
                                    grouped[classLevel] = {};
                                }
                                if (!grouped[classLevel][subName]) {
                                    grouped[classLevel][subName] = [];
                                }
                                grouped[classLevel][subName].push({
                                    id: fileSnap.key,
                                    dbPath,
                                    category: catSnap.key,
                                    ...fileData
                                });
                                totalUploads++;
                            }
                        });
                    });
                });
            });

            if (totalUploads === 0) {
                container.innerHTML = '<p>No uploads found.</p>';
                return;
            }

            const classes = Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b));

            classes.forEach(classLevel => {
                const subjects = grouped[classLevel];
                const classSection = document.createElement('div');
                classSection.className = 'w3-margin-bottom';
                
                const sectionId = `publisher-subjects-${classLevel}`;
                
                // Class Button (Accordion Trigger)
                const classBtn = document.createElement('button');
                classBtn.className = 'ash-button w3-block w3-left-align w3-large';
                classBtn.setAttribute('aria-expanded', 'false');
                classBtn.setAttribute('aria-controls', sectionId);
                classBtn.innerHTML = `Class ${classLevel} <span class="w3-right" aria-hidden="true">&#9660;</span>`;
                classBtn.onclick = () => toggleAccordion(sectionId, classBtn);
                
                // Subjects Container (Slide-down)
                const subjectsDiv = document.createElement('div');
                subjectsDiv.id = sectionId;
                subjectsDiv.dataset.accordionPanel = 'true';
                subjectsDiv.className = 'w3-hide w3-container ash-border-yellow w3-padding-16';
                subjectsDiv.style.borderLeft = '4px solid #FFFF00';
                subjectsDiv.style.marginLeft = '10px';
                subjectsDiv.innerHTML = `<h3 class="w3-large w3-bold w3-text-yellow">Select Subject</h3> <p>Select a subject below to view or delete your uploads.</p>`;

                const subjectNames = Object.keys(subjects).sort();

                subjectNames.forEach(subName => {
                    const filesArray = subjects[subName];
                    const fileCount = filesArray.length;

                    // Wrap each subject button in a full-width container div to force separate lines
                    const btnWrapper = document.createElement('div');
                    btnWrapper.className = 'w3-margin-bottom';

                    const subBtn = document.createElement('button');
                    subBtn.className = 'ash-button w3-block w3-left-align';
                    subBtn.innerText = `${subName} (${fileCount} Upload${fileCount !== 1 ? 's' : ''})`;
                    subBtn.onclick = (e) => showFileDetails(subName, filesArray, e.target);
                    
                    btnWrapper.appendChild(subBtn);
                    subjectsDiv.appendChild(btnWrapper);
                });

                classSection.appendChild(classBtn);
                classSection.appendChild(subjectsDiv);
                container.appendChild(classSection);
            });
        }).catch(err => {
            container.innerHTML = `<p>Error loading uploads: ${err.message}</p>`;
        });
    }

    let lastFocusedElement;

    function toggleAccordion(id, btn) {
        const x = document.getElementById(id);
        if (!x) return;
        const isOpen = x.classList.contains('w3-show');
        
        // Close all other accordion panels
        document.querySelectorAll('[data-accordion-panel="true"]').forEach(acc => {
            if (acc.id !== id && acc.classList.contains('w3-show')) {
                acc.classList.remove('w3-show');
                acc.classList.add('w3-hide');
                const otherBtn = acc.previousElementSibling;
                if (otherBtn) {
                    otherBtn.setAttribute('aria-expanded', 'false');
                    otherBtn.classList.remove('ash-button-active');
                    const span = otherBtn.querySelector('span');
                    if (span) span.innerHTML = '&#9660;';
                }
            }
        });

        // Toggle current one
        if (!isOpen) {
            x.classList.remove('w3-hide');
            x.classList.add('w3-show');
            btn.setAttribute('aria-expanded', 'true');
            btn.classList.add('ash-button-active');
            btn.querySelector('span').innerHTML = '&#9650;';
            announceToScreenReader(`${btn.textContent.replace('▲', '').replace('▼', '').trim()} subjects expanded.`);
        } else {
            x.classList.remove('w3-show');
            x.classList.add('w3-hide');
            btn.setAttribute('aria-expanded', 'false');
            btn.classList.remove('ash-button-active');
            btn.querySelector('span').innerHTML = '&#9660;';
            announceToScreenReader(`${btn.textContent.replace('▲', '').replace('▼', '').trim()} subjects collapsed.`);
        }
    }

    function showFileDetails(subject, filesArray, triggerElement) {
        lastFocusedElement = triggerElement;
        const modal = document.getElementById('file-modal');
        const content = document.getElementById('modal-content');
        const title = document.getElementById('modal-title');
        
        if (!modal || !content) return;

        const fileCount = filesArray.length;
        title.innerText = `${subject} - Uploaded Materials`;
        content.innerHTML = '';

        // Screen reader announcement for opening the modal
        const screenReaderMessage = `Uploaded materials modal opened for ${subject}. ${fileCount} file${fileCount === 1 ? '' : 's'} available.`;
        announceToScreenReader(screenReaderMessage);

        // Visual header info/message box inside the modal
        const infoMsg = document.createElement('div');
        infoMsg.className = 'w3-panel w3-border ash-border-yellow w3-padding w3-margin-bottom';
        infoMsg.style.backgroundColor = '#111111';
        
        if (fileCount > 1) {
            infoMsg.innerHTML = `
                <p class="w3-large w3-bold w3-text-yellow" style="margin:0 0 8px 0;">📚 Multiple Uploads Available</p>
                <p style="margin:0;">There are <strong>${fileCount}</strong> uploads available for <strong>${subject}</strong>. You can verify or delete them below.</p>
            `;
        } else if (fileCount === 1) {
            infoMsg.innerHTML = `
                <p class="w3-large w3-bold w3-text-yellow" style="margin:0 0 8px 0;">📚 1 Upload Available</p>
                <p style="margin:0;">There is <strong>1</strong> upload available for <strong>${subject}</strong>. You can verify or delete it below.</p>
            `;
        } else {
            infoMsg.innerHTML = `
                <p class="w3-large w3-bold w3-text-yellow" style="margin:0;">❌ No Files Found</p>
            `;
        }
        content.appendChild(infoMsg);

        if (fileCount === 0) {
            const noData = document.createElement('p');
            noData.innerText = 'No files available.';
            content.appendChild(noData);
        } else {
            filesArray.forEach(file => {
                const card = document.createElement('div');
                card.className = 'ash-card w3-margin-bottom fade-in';
                card.setAttribute('role', 'group');
                card.setAttribute('aria-labelledby', `file-title-${file.id}`);
                
                // Get display category name
                const catLabel = file.category === 'books' ? 'Book' :
                                 file.category === 'notes' ? 'Notes' :
                                 file.category === 'practice' ? 'Practice Questions' : 'Sample Paper';
                                 
                card.innerHTML = `
                    <h3 class="w3-large w3-bold w3-text-yellow" id="file-title-${file.id}" style="margin-top:0;">${file.title}</h3>
                    <p style="margin: 4px 0;"><strong>Type:</strong> ${catLabel}</p>
                    <p style="margin: 4px 0;"><strong>Size:</strong> ${file.size || 'N/A'}</p>
                    <p style="margin: 4px 0;"><strong>Format:</strong> ${file.format || 'N/A'}</p>
                    <div style="display:flex; gap:12px; margin-top:12px;">
                        <a href="${file.downloadUrl}" target="_blank" class="ash-button w3-center" style="flex:1; border-width: 2px;" aria-label="Download ${file.title}">📥 Download</a>
                        <button onclick="deleteMaterialFromModal('${file.dbPath.replace(/'/g, "\\'")}')" class="ash-button w3-center" style="flex:1; border-width: 2px; border-color:#ff4444; color:#ff4444;" aria-label="Delete ${file.title}">🗑 Delete</button>
                    </div>
                `;
                content.appendChild(card);
            });
        }

        modal.style.display = 'block';
        // Focus management: focus the modal title for screen readers
        setTimeout(() => {
            title.focus();
        }, 100);
    }

    // Helper to announce status to screen readers
    function announceToScreenReader(msg) {
        let announcer = document.getElementById('global-live-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'global-live-announcer';
            announcer.className = 'w3-sr-only';
            announcer.setAttribute('aria-live', 'polite');
            document.body.appendChild(announcer);
        }
        announcer.textContent = msg;
    }

    // Close modal function with focus return
    window.closeFileModal = function() {
        const modal = document.getElementById('file-modal');
        if (modal) {
            modal.style.display = 'none';
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }
    };

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('file-modal');
            if (modal && modal.style.display === 'block') {
                closeFileModal();
            }
        }
    });

    window.deleteMaterialFromModal = function(dbPath) {
        if (!confirm('Are you sure you want to delete this material? This cannot be undone.')) return;
        firebase.database().ref(dbPath).remove()
            .then(() => {
                // Close modal
                const modal = document.getElementById('file-modal');
                if (modal) modal.style.display = 'none';
                
                announce('Material deleted successfully.', 'success');
                const user = firebase.auth().currentUser;
                if (user) loadPublisherUploads(user.uid);
            })
            .catch(err => announce('Delete error: ' + err.message, 'error'));
    };
});
