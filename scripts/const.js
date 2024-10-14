export const Constants = {
    ID: "advanced-requests"
}

export const visualNoverIsActive = () => {
    const vndData = game.modules.get("visual-novel-dialogues")
    return vndData?.active && isNewerVersion(vndData?.version, "1.5.9")
}