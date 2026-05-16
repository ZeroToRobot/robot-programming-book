(function () {
    function injectSectionLabel() {
        // active class is on the <a> element, not the <li>
        var activeLink = document.querySelector('mdbook-sidebar-scrollbox a.active');
        if (!activeLink) return;

        var chapterItem = activeLink.closest('li.chapter-item');
        if (!chapterItem) return;

        // Walk backwards through siblings to find the nearest part title
        var sibling = chapterItem.previousElementSibling;
        while (sibling) {
            if (sibling.classList.contains('part-title')) {
                var label = document.createElement('p');
                label.className = 'section-label';
                label.textContent = sibling.textContent.trim();
                var content = document.querySelector('.content main');
                if (content) content.insertBefore(label, content.firstChild);
                return;
            }
            sibling = sibling.previousElementSibling;
        }
    }

    // connectedCallback runs synchronously, so sidebar is already populated.
    // Use DOMContentLoaded only as a safety net if script somehow runs early.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectSectionLabel);
    } else {
        injectSectionLabel();
    }
})();
