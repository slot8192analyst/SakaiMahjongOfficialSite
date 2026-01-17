document.addEventListener('DOMContentLoaded', function() {
    fetch('data/records.json')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('records-container');
            
            data.records.forEach(record => {
                const section = document.createElement('div');
                section.className = 'section';
                
                let tableRows = '';
                record.results.forEach(result => {
                    const rankClass = `rank-${result.rank}`;
                    const pointClass = result.point >= 0 ? 'score-plus' : 'score-minus';
                    const pointText = result.point >= 0 ? `+${result.point}` : result.point;
                    
                    tableRows += `
                        <tr>
                            <td class="${rankClass}">${result.rank}位</td>
                            <td>${result.player}</td>
                            <td>${result.score.toLocaleString()}</td>
                            <td class="${pointClass}">${pointText}</td>
                        </tr>
                    `;
                });
                
                section.innerHTML = `
                    <div class="section-header">
                        <span>📅</span>
                        <span>${record.date} 対局結果</span>
                    </div>
                    <table class="record-table">
                        <thead>
                            <tr>
                                <th>順位</th>
                                <th>プレイヤー</th>
                                <th>得点</th>
                                <th>ポイント</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                `;
                
                container.appendChild(section);
            });
        })
        .catch(err => {
            console.error('戦績データの読み込みエラー:', err);
        });
});
