//############################
//##                        ##
//##  hi03 ATSセレクタ v1.0  ##
//##                        ##
//############################
function atsSelector(entity, atsButtonList, operationAtsList, atsOptions) {
    if (!entity) return;
    var dataMap = entity.getResourceState().getDataMap();
    var atsSwitch = null;
    var config = entity.getResourceState().getResourceSet().getConfig();//1.7.10 - 1.12対応
    var customButtons = config.customButtons || null;
    if (customButtons) {
        var buttonIndex = null;
        for (var i = 0; i < customButtons.length; i++) {
            if (customButtons[i][0] === "ATS:OFF") {//"ATS:OFF"を0番目に持つボタン番号を検索する
                buttonIndex = i;
                break;
            }
        }
        if (buttonIndex !== null) {
            var buttonId = "Button" + buttonIndex;
            var atsIndex = dataMap.getInt(buttonId);
            atsSwitch = customButtons[buttonIndex][atsIndex];//文字列を返す
        }
    }
    var prevATSSwitch = dataMap.getString("prevATSSwitch");
    var atsType = dataMap.getString("ATSType");
    if (atsSwitch) {
        //ATSボタン切り替え
        if (prevATSSwitch !== atsSwitch) {
            dataMap.setString("prevATSSwitch", atsSwitch, 0);
            var ats_id = atsButtonList[atsSwitch] ? atsButtonList[atsSwitch] : "ATS:OFF";
            dataMap.setString("ATSType", ats_id, 1);
            atsType = ats_id;
        }
    }
    for (var i = 0; i < operationAtsList.length; i++) {
        operationAtsList[i](entity, atsType, atsOptions);
    }
}