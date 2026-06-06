//#################################
//##                             ##
//##  hi03 ATS-Sxプラグイン v1.0  ##
//##                             ##
//#################################
/*
1.この関数を音声スクリプトにコピーします
2.onUpdate(su) の中に operationATS_Sx(su); を記述します
3.ユーザー設定で再生する音声の割当を設定します
*/

var ATS_Sx_SoundManager = new java.util.WeakHashMap();
function operationATS_Sx(su, settings) {
    if (!settings) settings = {
        soundList: {},
        loopSoundList: {}
    }
    var ats_id = "ATS-Sx";
    var soundList = settings.soundList;
    var loopSoundList = settings.loopSoundList;

    var entity = su.getEntity();
    if (!entity) return;
    var dataMap = entity.getResourceState().getDataMap();
    var atsType = dataMap.getString("ATSType");

    //デフォルトATS無効化
    if (atsType !== "") {
        var atsSound = Packages.jp.ngt.ngtlib.util.NGTUtil.getField(Packages.jp.ngt.rtm.sound.SoundUpdaterTrain.class, su, ["atsSound"]);
        if (atsSound) {
            if (atsSound[0]) atsSound[0].stop();
            if (atsSound[1]) atsSound[1].stop();
        }
    }
    var state = function () {
        var dm = dataMap;
        return {
            isATSBrake: dm.getBoolean("ATS-Sx_isATSBrake"),                 //ATSブレーキ:直下地上子
            isATSLongBrake: dm.getBoolean("ATS-Sx_isATSLongBrake"),         //ATSブレーキ:Sx未確認
            isLongAlert: dm.getBoolean("ATS-Sx_isLongAlert"),               //ATS警報ベル(ジリジリ)
            isAtsFault: dm.getBoolean("ATS-Sx_isAtsFault"),                 //Sx故障
            isBrakeDisable: dm.getBoolean("ATS-Sx_isATSBrakeDisable"),      //ブレーキ開放
            isLongAlertLatched: dm.getBoolean("ATS-Sx_isLongAlertLatched"), //ATS警報持続(キンコン)
            isAlertButton1Pressed: dm.getBoolean("ATS-Sx_acknowledgeAlert"),//ATS確認ボタン押下
            isAlertButton2Pressed: dm.getBoolean("ATS-Sx_pushAlertButton"), //ATS警報持続ボタン押下
            isInitialize: dm.getBoolean("ATS-Sx_isInitialize"),             //ATS初期化中
            maxSpeed: dm.getInt("ATS-Sx_maxSpeed")                          //列車選択スイッチの速度/列車最高速度
        }
    }();
    var shouldPlaySound = function (flags, prevFlags) {
        for (var i = 0; i < flags.length; i++) {
            if (flags[i] && !prevFlags[i]) return true;
        }
        return false;
    };
    var anyPlaySound = function (flags) {
        return flags.indexOf(true) !== -1;
    };

    //サウンド登録
    var isPlayingSound = {};
    var prevPlayingSound = ATS_Sx_SoundManager.get(entity) || {};
    var soundListKeys = Object.keys(soundList);
    for (var i = 0; i < soundListKeys.length; i++) {
        var soundName = soundList[soundListKeys[i]];
        isPlayingSound[soundName] = [];
        if (prevPlayingSound[soundName] === undefined) prevPlayingSound[soundName] = [];
    }
    var loopSoundListKeys = Object.keys(loopSoundList);
    for (var i = 0; i < loopSoundListKeys.length; i++) {
        var soundName = loopSoundList[loopSoundListKeys[i]];
        isPlayingSound[soundName] = [];
        if (prevPlayingSound[soundName] === undefined) prevPlayingSound[soundName] = [];
    }

    //再生終了
    var isSoundReset = dataMap.getBoolean(ats_id + "_isSoundReset");
    if (atsType !== ats_id) {
        if (!isSoundReset) {
            //再生停止(非ループ)
            for (var i = 0; i < soundListKeys.length; i++) {
                var soundName = soundList[soundListKeys[i]];
                var sound = soundName.split(":");
                su.stopSound(sound[0], sound[1]);
            }
            //再生停止(ループ)
            for (var i = 0; i < loopSoundListKeys.length; i++) {
                var soundName = loopSoundList[loopSoundListKeys[i]];
                var sound = soundName.split(":");
                su.stopSound(sound[0], sound[1]);
            }

            dataMap.setBoolean(ats_id + "_isSoundReset", true, 0);
        }
        return;
    }
    else if (isSoundReset) dataMap.setBoolean(ats_id + "_isSoundReset", false, 0);

    //再生条件
    //ATS確認ボタン押下
    isPlayingSound[soundList.pushButton1].push(state.isAlertButton1Pressed);
    //ATS警報持続ボタン押下
    isPlayingSound[soundList.pushButton2].push(state.isAlertButton2Pressed);

    //ATSブレーキ:直下地上子 [ループ音]
    isPlayingSound[loopSoundList.atsBrakeDirect].push(state.isATSBrake);
    //ATSブレーキ:Sx未確認 [ループ音]
    isPlayingSound[loopSoundList.atsBrakeLong].push(state.isATSLongBrake);
    //ATS警報ベル(ジリジリ) [ループ音]
    isPlayingSound[loopSoundList.alert1].push(state.isLongAlert || state.isInitialize);
    //ATS警報持続(キンコン) [ループ音]
    isPlayingSound[loopSoundList.alert2].push(state.isLongAlertLatched);

    //再生(非ループ)
    for (var i = 0; i < soundListKeys.length; i++) {
        var soundName = soundList[soundListKeys[i]];
        if (!soundName) continue;
        if (shouldPlaySound(isPlayingSound[soundName], prevPlayingSound[soundName])) {
            var sound = soundName.split(":");
            su.stopSound(sound[0], sound[1]);
            su.playSound(sound[0], sound[1], 1, 1, false);
        }
    }
    //再生(ループ)
    for (var i = 0; i < loopSoundListKeys.length; i++) {
        var soundName = loopSoundList[loopSoundListKeys[i]];
        if (!soundName) continue;
        var sound = soundName.split(":");
        if (anyPlaySound(isPlayingSound[soundName])) su.playSound(sound[0], sound[1], 1, 1, true);
        else su.stopSound(sound[0], sound[1]);
    }

    //フラグ保存
    ATS_Sx_SoundManager.put(entity, isPlayingSound);
}