// Realtime Database logic for hierarchical materials (Class -> Subject -> File)
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    let category = '';
    const container = document.getElementById('books-container') || 
                    document.getElementById('notes-container') || 
                    document.getElementById('practice-container') || 
                    document.getElementById('sample-papers-container');

    if (path.includes('books.html')) category = 'books';
    else if (path.includes('notes.html')) category = 'notes';
    else if (path.includes('practice.html')) category = 'practice';
    else if (path.includes('sample-papers.html')) category = 'sample-papers';

    if (category && container) {
        fetchHierarchicalMaterials(category, container);
    }

    function fetchHierarchicalMaterials(cat, container) {
        firebase.database().ref(`materials/${cat}`).once('value').then((snapshot) => {
            container.innerHTML = '';
            if (!snapshot.exists()) {
                container.innerHTML = '<div class="ash-card"><p>No materials found for this category.</p></div>';
                return;
            }

            const data = snapshot.val();
            const classes = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b));

            classes.forEach(classLevel => {
                const subjects = data[classLevel];
                const classSection = document.createElement('div');
                classSection.className = 'w3-margin-bottom';
                
                const sectionId = `subjects-${classLevel}`;
                
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

                // Proper messaging depending on category (removed the "One subject may contain..." sentence as requested)
                let introText = '';
                if (cat === 'books') {
                    introText = `Select a subject below to view available books.`;
                } else if (cat === 'notes') {
                    introText = `Select a subject below to view available notes.`;
                } else if (cat === 'practice') {
                    introText = `Select a subject below to view practice questions.`;
                } else {
                    introText = `Select a subject below to view available sample papers.`;
                }
                subjectsDiv.innerHTML = `<h3 class="w3-large w3-bold w3-text-yellow">Select Subject</h3> <p>${introText}</p>`;

                const subjectNames = Object.keys(subjects).sort();

                subjectNames.forEach(subName => {
                    const files = subjects[subName];
                    const filesArray = Object.values(files).filter(f => f && typeof f === 'object');
                    const fileCount = filesArray.length;

                    // Dynamic label showing quantity
                    let displayLabel = '';
                    if (cat === 'books') {
                        displayLabel = `${subName} (${fileCount} Book${fileCount !== 1 ? 's' : ''})`;
                    } else if (cat === 'notes') {
                        displayLabel = `${subName} (${fileCount} Note${fileCount !== 1 ? 's' : ''})`;
                    } else if (cat === 'practice') {
                        displayLabel = `${subName} (${fileCount} Practice Paper${fileCount !== 1 ? 's' : ''})`;
                    } else if (cat === 'sample-papers') {
                        displayLabel = `${subName} (${fileCount} Sample Paper${fileCount !== 1 ? 's' : ''})`;
                    } else {
                        displayLabel = `${subName} (${fileCount} Item${fileCount !== 1 ? 's' : ''})`;
                    }

                    // Wrap each subject button in a full-width container div to force separate lines
                    const btnWrapper = document.createElement('div');
                    btnWrapper.className = 'w3-margin-bottom';

                    const subBtn = document.createElement('button');
                    subBtn.className = 'ash-button w3-block w3-left-align';
                    subBtn.innerText = displayLabel;
                    subBtn.onclick = (e) => showFileDetails(subName, files, e.target, cat);
                    
                    btnWrapper.appendChild(subBtn);
                    subjectsDiv.appendChild(btnWrapper);
                });

                classSection.appendChild(classBtn);
                classSection.appendChild(subjectsDiv);
                container.appendChild(classSection);
            });
        }).catch(err => {
            console.error(err);
            container.innerHTML = '<p>Error loading materials.</p>';
        });
    }

    let lastFocusedElement;

    function toggleAccordion(id, btn) {
        const x = document.getElementById(id);
        if (!x) return;
        const isOpen = x.classList.contains('w3-show');
        
        // Close all other accordion panels (only target panels, not all .w3-hide elements)
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

    function showFileDetails(subject, files, triggerElement, cat) {
        lastFocusedElement = triggerElement;
        const modal = document.getElementById('file-modal');
        const content = document.getElementById('modal-content');
        const title = document.getElementById('modal-title');
        
        if (!modal || !content) return;

        const filesArray = Object.values(files).filter(f => f && typeof f === 'object');
        const fileCount = filesArray.length;

        // Dynamic labels matching category terms
        const terms = {
            'books': { singular: 'Book', plural: 'Books' },
            'notes': { singular: 'Note', plural: 'Notes' },
            'practice': { singular: 'Practice Paper', plural: 'Practice Papers' },
            'sample-papers': { singular: 'Sample Paper', plural: 'Sample Papers' }
        };
        const term = terms[cat] || { singular: 'Material', plural: 'Materials' };

        title.innerText = `${subject} - ${term.singular} Selection`;
        content.innerHTML = '';

        // Screen reader announcement for opening the modal
        const screenReaderMessage = `${term.plural} modal opened for ${subject}. ${fileCount} ${fileCount === 1 ? term.singular.toLowerCase() : term.plural.toLowerCase()} available.`;
        announceToScreenReader(screenReaderMessage);

        // Visual header info/message box inside the modal
        const infoMsg = document.createElement('div');
        infoMsg.className = 'w3-panel w3-border ash-border-yellow w3-padding w3-margin-bottom';
        infoMsg.style.backgroundColor = '#111111';
        
        if (fileCount > 1) {
            infoMsg.innerHTML = `
                <p class="w3-large w3-bold w3-text-yellow" style="margin:0 0 8px 0;">📚 Multiple ${term.plural} Available</p>
                <p style="margin:0;">There are <strong>${fileCount}</strong> different ${term.plural.toLowerCase()} available for <strong>${subject}</strong>. Please select the one you wish to download below.</p>
            `;
        } else if (fileCount === 1) {
            infoMsg.innerHTML = `
                <p class="w3-large w3-bold w3-text-yellow" style="margin:0 0 8px 0;">📚 1 ${term.singular} Available</p>
                <p style="margin:0;">There is <strong>1</strong> ${term.singular.toLowerCase()} available for <strong>${subject}</strong>. You can download it below.</p>
            `;
        } else {
            infoMsg.innerHTML = `
                <p class="w3-large w3-bold w3-text-yellow" style="margin:0;">❌ No Files Found</p>
            `;
        }
        content.appendChild(infoMsg);

        if (fileCount === 0) {
            const noData = document.createElement('p');
            noData.innerText = 'No file details available.';
            content.appendChild(noData);
        } else {
            filesArray.forEach(file => {
                const card = document.createElement('div');
                card.className = 'ash-card w3-margin-bottom fade-in';
                card.setAttribute('role', 'group');
                card.setAttribute('aria-labelledby', `file-title-${file.createdAt}`);
                card.innerHTML = `
                    <h3 class="w3-large w3-bold w3-text-yellow" id="file-title-${file.createdAt}" style="margin-top:0;">${file.title}</h3>
                    <p style="margin: 4px 0;"><strong>Size:</strong> ${file.size || 'N/A'}</p>
                    <p style="margin: 4px 0;"><strong>Format:</strong> ${file.format || 'N/A'}</p>
                    <a href="${file.downloadUrl}" target="_blank" class="ash-button w3-block w3-center w3-margin-top" style="border-width: 3px;" aria-label="Download ${file.title} (${file.size || 'unknown size'}, ${file.format || 'unknown format'})">
                        📥 Download ${term.singular}
                    </a>
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
});
