const text1 = document.getElementById('text1');
const text2 = document.getElementById('text2');
const diff1 = document.getElementById('diff1');
const diff2 = document.getElementById('diff2');
const diff1Title = document.getElementById('diff1-title');
const diff2Title = document.getElementById('diff2-title');

const diff1Changes = document.getElementById('diff1-changes');
const diff2Changes = document.getElementById('diff2-changes');

const diffNav = document.getElementById('diff-nav');
const prevDiffBtn = document.getElementById('prev-diff');
const nextDiffBtn = document.getElementById('next-diff');
const diffCounter = document.getElementById('diff-counter');

const dmp = new diff_match_patch();

let diffGroupCount = 0;
let currentDiffIndex = -1;

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

// 連続する差分(del/ins)を1つのグループとして番号付けする
function assignDiffGroups(diffs) {
    let groupIndex = -1;
    let prevChanged = false;
    return diffs.map(part => {
        const changed = part[0] !== 0;
        if (changed && !prevChanged) groupIndex++;
        prevChanged = changed;
        return changed ? groupIndex : -1;
    });
}

function renderDiffLeft(a, b, diffs, groups) {
    return diffs.map((part, i) => {
        const type = part[0], text = part[1];
        if (type === -1) return `<del data-diff-index="${groups[i]}">${escapeHtml(text)}</del>`;
        if (type === 1) return '';
        return `<span>${escapeHtml(text)}</span>`;
    }).join('');
}

function renderDiffRight(a, b, diffs, groups) {
    return diffs.map((part, i) => {
        const type = part[0], text = part[1];
        if (type === 1) return `<ins data-diff-index="${groups[i]}">${escapeHtml(text)}</ins>`;
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

    const groupsLeft = assignDiffGroups(diffsLeft);
    const groupsRight = assignDiffGroups(diffsRight);

    // 左（元テキスト側）
    diff1.innerHTML = renderDiffLeft(text1.value, text2.value, diffsLeft, groupsLeft);
    diff1Title.textContent = `元テキスト側の差分表示 ${changedLeft ? '(差分あり)' : '(差分なし)'}`;
    diff1Title.className = changedLeft ? 'title-changed' : '';
    diff1Changes.className = changedLeft ? 'diff-changes' : '';
    diff1Changes.innerHTML = changedLeft ? genChangeLines(lineDiffs) : '';
    diff1.className = '';

    // 右（比較テキスト側）にも 同じ行番号リストを表示
    diff2.innerHTML = renderDiffRight(text1.value, text2.value, diffsRight, groupsRight);
    diff2Title.textContent = `比較テキスト側の差分表示 ${changedRight ? '(差分あり)' : '(差分なし)'}`;
    diff2Title.className = changedRight ? 'title-changed' : '';
    diff2Changes.className = changedRight ? 'diff-changes' : '';
    diff2Changes.innerHTML = changedRight ? genChangeLines(lineDiffs) : '';
    diff2.className = '';

    // 差分ナビゲーションの更新
    const maxGroupIndex = Math.max(-1, ...groupsLeft, ...groupsRight);
    diffGroupCount = maxGroupIndex + 1;
    currentDiffIndex = -1;
    updateDiffCounter();
}

function getDiffElements(index) {
    return document.querySelectorAll(`[data-diff-index="${index}"]`);
}

function clearActiveDiff() {
    document.querySelectorAll('.diff-active').forEach(el => el.classList.remove('diff-active'));
}

function goToDiff(index) {
    if (diffGroupCount === 0) return;
    currentDiffIndex = (index + diffGroupCount) % diffGroupCount;
    clearActiveDiff();
    const elements = getDiffElements(currentDiffIndex);
    elements.forEach(el => el.classList.add('diff-active'));
    if (elements.length) {
        elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateDiffCounter();
}

function updateDiffCounter() {
    const hasDiffs = diffGroupCount > 0;
    diffCounter.textContent = hasDiffs
        ? `${currentDiffIndex + 1} / ${diffGroupCount}`
        : '0 / 0';
    prevDiffBtn.disabled = !hasDiffs;
    nextDiffBtn.disabled = !hasDiffs;
    diffNav.classList.toggle('visible', hasDiffs);
    document.body.classList.toggle('diff-nav-active', hasDiffs);
}

prevDiffBtn.addEventListener('click', () => goToDiff(currentDiffIndex - 1));
nextDiffBtn.addEventListener('click', () => goToDiff(currentDiffIndex + 1));

text1.addEventListener('input', updateDiff);
text2.addEventListener('input', updateDiff);

updateDiff();