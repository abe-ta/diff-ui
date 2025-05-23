const text1 = document.getElementById('text1');
const text2 = document.getElementById('text2');
const diff1 = document.getElementById('diff1');
const diff2 = document.getElementById('diff2');
const diff1Title = document.getElementById('diff1-title');
const diff2Title = document.getElementById('diff2-title');

const diff1Changes = document.getElementById('diff1-changes');
const diff2Changes = document.getElementById('diff2-changes');

const dmp = new diff_match_patch();

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[ch]));
}

// 行単位で削除・追加された行番号を取得
function calculateLineDiffs(textA, textB) {
    const aLines = textA.split('\n');
    const bLines = textB.split('\n');
    const diff = dmp.diff_main(aLines.join('\n'), bLines.join('\n'));
    dmp.diff_cleanupSemantic(diff);

    // aLines, bLinesを比較して、削除・追加行番号をとる
    // もっと正確にやるなら行単位diffしたほうがよい
    // ここでは簡易的に
    let deleted = [];
    let added = [];
    let i = 0, j = 0;
    let la = aLines.length, lb = bLines.length;

    const JsDiff = window.JsDiff; // 無ければnull
    // 行単位diff: 公式dmpにはないので自作
    // 双方長さに補正あり
    while(i < la || j < lb){
        const lineA = i < la ? aLines[i] : null;
        const lineB = j < lb ? bLines[j] : null;
        if(lineA === lineB){ //同じ
            i++; j++;
        }else if(lineA !== null && !bLines.includes(lineA)){ // 左にだけ存在
            deleted.push(i+1);
            i++;
        }else if(lineB !== null && !aLines.includes(lineB)){ //右にだけ存在
            added.push(j+1);
            j++;
        }else{ //両方にあるけど位置違い/重複
            i++; j++; //無理に進める（誤検知もあるので注意）
        }
    }
    return {deleted, added};
}

function renderDiffLeft(a, b, diffs) {
    return diffs.map(part => {
        const type = part[0], text = part[1];
        if (type === -1) return `<del>${escapeHtml(text)}</del>`;
        if (type === 1) return '';
        return `<span>${escapeHtml(text)}</span>`;
    }).join('');
}

function renderDiffRight(a, b, diffs) {
    return diffs.map(part => {
        const type = part[0], text = part[1];
        if (type === 1) return `<ins>${escapeHtml(text)}</ins>`;
        if (type === -1) return '';
        return `<span>${escapeHtml(text)}</span>`;
    }).join('');
}

// [-1,1]のいずれかが含まれるなら差分あり
function hasDiff(diffs) {
    return diffs.some(part => part[0] !== 0);
}

function updateDiff() {
    // 差分本体
    const diffsLeft = dmp.diff_main(text1.value, text2.value);
    dmp.diff_cleanupSemantic(diffsLeft);

    const diffsRight = dmp.diff_main(text1.value, text2.value);
    dmp.diff_cleanupSemantic(diffsRight);

    const changedLeft = hasDiff(diffsLeft);
    const changedRight = hasDiff(diffsRight);

    // 行単位の差分検出
    const lineDiffs = calculateLineDiffs(text1.value, text2.value);

    // 共通関数でhtml生成
    function genChangeLines({deleted, added}) {
        let htmls = [];
        if (deleted.length) htmls.push(`削除(行番号): ${deleted.join(', ')}`);
        if (added.length) htmls.push(`追加(行番号): ${added.join(', ')}`);
        return htmls.join('<br>');
    }

    // 左（元テキスト側）
    diff1.innerHTML = renderDiffLeft(text1.value, text2.value, diffsLeft);
    diff1Title.textContent = `元テキスト側の差分表示 ${changedLeft ? '(差分あり)' : '(差分なし)'}`;
    diff1Title.className = changedLeft ? 'title-changed' : '';
    diff1Changes.className = changedLeft ? 'diff-changes' : '';
    diff1Changes.innerHTML = changedLeft ? genChangeLines(lineDiffs) : '';
    diff1.className = '';

    // 右（比較テキスト側）にも 同じ行番号リストを表示
    diff2.innerHTML = renderDiffRight(text1.value, text2.value, diffsRight);
    diff2Title.textContent = `比較テキスト側の差分表示 ${changedRight ? '(差分あり)' : '(差分なし)'}`;
    diff2Title.className = changedRight ? 'title-changed' : '';
    diff2Changes.className = changedRight ? 'diff-changes' : '';
    diff2Changes.innerHTML = changedRight ? genChangeLines(lineDiffs) : '';
    diff2.className = '';
}

text1.addEventListener('input', updateDiff);
text2.addEventListener('input', updateDiff);

updateDiff();