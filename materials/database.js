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
                subjectsDiv.className = 'w3-hide w3-container ash-border-yellow w3-padding-16';
                subjectsDiv.style.borderLeft = '4px solid #FFFF00';
                subjectsDiv.style.marginLeft = '10px';
                subjectsDiv.setAttribute('role', 'region');
                subjectsDiv.setAttribute('aria-label', `Subjects for Class ${classLevel}`);

                const subjectNames = Object.keys(subjects).sort();

                subjectNames.forEach(subName => {
                    const files = subjects[subName];
                    const subBtn = document.createElement('button');
                    subBtn.className = 'ash-button w3-margin-right w3-margin-bottom';
                    subBtn.innerText = cat === 'books' ? `Download ${subName} book` : subName;
                    subBtn.setAttribute('aria-label', cat === 'books' ? `View details for ${subName} book` : `View files for ${subName}`);
                    subBtn.onclick = (e) => showFileDetails(subName, files, e.target, cat);
                    subjectsDiv.appendChild(subBtn);
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
        const isOpen = x.classList.contains('w3-show');
        
        // Close all other accordions
        document.querySelectorAll('.w3-hide').forEach(acc => {
            if (acc.id !== id) {
                acc.classList.remove('w3-show');
                const otherBtn = acc.previousElementSibling;
                otherBtn.setAttribute('aria-expanded', 'false');
                otherBtn.querySelector('span').innerHTML = '&#9660;';
            }
        });

        // Toggle current one
        if (!isOpen) {
            x.classList.add('w3-show');
            btn.setAttribute('aria-expanded', 'true');
            btn.querySelector('span').innerHTML = '&#9650;';
        } else {
            x.classList.remove('w3-show');
            btn.setAttribute('aria-expanded', 'false');
            btn.querySelector('span').innerHTML = '&#9660;';
        }
    }

    function showFileDetails(subject, files, triggerElement, cat) {
        lastFocusedElement = triggerElement;
        const modal = document.getElementById('file-modal');
        const content = document.getElementById('modal-content');
        const title = document.getElementById('modal-title');
        
        if (!modal || !content) return;

        const label = cat === 'books' ? 'Book' : 'File';
        title.innerText = `${subject} - ${label} Details`;
        content.innerHTML = '';

        Object.values(files).forEach(file => {
            const detailHtml = `
                <div class="ash-card w3-margin-bottom" role="group" aria-labelledby="file-title-${file.createdAt}">
                    <h3 class="w3-large w3-bold" id="file-title-${file.createdAt}">${file.title}</h3>
                    <p><strong>Size:</strong> ${file.size || 'N/A'}</p>
                    <p><strong>Format:</strong> ${file.format || 'N/A'}</p>
                    <a href="${file.downloadUrl}" target="_blank" class="ash-button w3-block w3-center" aria-label="Download ${file.title}">Download ${label}</a>
                </div>
            `;
            content.insertAdjacentHTML('beforeend', detailHtml);
        });

        modal.style.display = 'block';
        // Focus management: focus the modal title for screen readers
        setTimeout(() => {
            title.focus();
        }, 100);
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
