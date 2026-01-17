document.addEventListener('DOMContentLoaded', function() {
    fetch('data/stats.json')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('stats-body');
            
            // 総ポイントで降順ソート
            const sorted = data.players.sort((a, b) => b.totalPoint - a.totalPoint);
            
            sorted.forEach((player, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                const pointClass = player.totalPoint >= 0 ? 'score-plus' : 'score-minus';
                const pointText = player.totalPoint >= 0 ? `+${player.totalPoint}` : player.totalPoint;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="${rankClass}">${rank}位</td>
                    <td>${player.name}</td>
                    <td>${player.games}</td>
                    <td class="${pointClass}">${pointText}</td>
                    <td>${player.avgRank.toFixed(2)}</td>
                    <td>${player.rank1}</td>
                    <td>${player.rank2}</td>
                    <td>${player.rank3}</td>
                    <td>${player.rank4}</td>
                `;
                
                tbody.appendChild(row);
            });
        })
        .catch(err => {
            console.error('成績データの読み込みエラー:', err);
        });
});
