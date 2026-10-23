export function calculateQualityScore(checklist){
    const checkedItems = checklist.filter(
        item => item.result === "통과" || item.result === "불합격"
    );

    if(checkedItems.length === 0){
        return 0;
    }

    const passedItems = checkedItems.filter(
        item => item.result === "통과"
    );

    const score = (passedItems.length / checkedItems.length) * 10

    return score.toFixed(1);
}