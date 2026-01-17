function toggleCollapsible(element) {
    element.classList.toggle('collapsed');
    const content = element.nextElementSibling;
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

function toggleImage(event, imageId) {
    event.stopPropagation();
    const imageContainer = document.getElementById(imageId);
    const button = event.currentTarget;
    
    if (imageContainer.classList.contains('show')) {
        imageContainer.classList.remove('show');
        button.classList.remove('active');
        button.textContent = '📷 写真を表示';
    } else {
        imageContainer.classList.add('show');
        button.classList.add('active');
        button.textContent = '📷 写真を非表示';
    }
}

function loadContent(url, elementId) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            document.getElementById(elementId).innerHTML = html;
        })
        .catch(err => {
            console.error('読み込みエラー:', err);
        });
}

document.addEventListener('DOMContentLoaded', function() {
    // コンテンツを読み込む
    loadContent('contents/updates.html', 'updates-content');
    loadContent('contents/houserules.html', 'houserules-content');

    // 更新履歴は展開状態にする
    document.querySelectorAll('.collapsible').forEach(c => {
        if (c.classList.contains('section-header')) {
            c.classList.remove('collapsed');
            c.nextElementSibling.style.display = 'block';
        }
    });
});
