//#################################
//##                             ##
//##  hi03 ATS-Pプラグイン v1.0   ##
//##                             ##
//#################################
var ATS_P_East_SoundManager = new java.util.WeakHashMap();
function operationATS_P_East(su, settings) {
    if (!settings) settings = {
        soundList: {},
        loopSoundList: {}
    }
    var ats_id = "ATS-P_East";
    var soundList = settings.soundList;
    var loopSoundList = settings.loopSoundList;

    var entity = su.getEntity();
    if (!entity) return;
    var dataMap = entity.getResourceState().getDataMap();
    var atsType = dataMap.getString("ATSType");

    //デフォルトATS無効化
    var atsType = dataMap.getString("ATSType");
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
            isATSBrake: dm.getBoolean("ATS-P_East_isATSBrake"),                 //ATSブレーキ:直下地上子
            isPatternBrake: dm.getBoolean("ATS-P_East_isPatternBrake"),         //ATSブレーキ:パターン抵触
            isPatternBrakeFull : dm.getBoolean("ATS-P_East_isPatternBrakeFull"),//ATSブレーキ:パターン抵触
            isATSLongBrake: dm.getBoolean("ATS-P_East_isATSLongBrake"),         //ATSブレーキ:Sn未確認
            isRollbackBrake: dm.getBoolean("ATS-P_East_isRollbackBrake"),       //ATSブレーキ:後退検知
            patternSpeed: dm.getDouble("ATS-P_East_patternSpeed"),              //パターン速度
            isPatternApproaching: dm.getBoolean("ATS-P_East_patternAlert"),     //パターン接近
            isLongAlert: dm.getBoolean("ATS-P_East_isLongAlert"),               //ATS警報ベル(ジリジリ)
            isAtsFault: dm.getBoolean("ATS-P_East_isAtsFault"),                 //Ps故障
            isBrakeDisable: dm.getBoolean("ATS-P_East_isATSBrakeDisable"),      //ブレーキ開放
            isLongAlertLatched: dm.getBoolean("ATS-P_East_isLongAlertLatched"), //ATS警報持続(キンコン)
            isAlertButton1Pressed: dm.getBoolean("ATS-P_East_acknowledgeAlert"),//ATS確認ボタン押下
            isAlertButton2Pressed: dm.getBoolean("ATS-P_East_pushAlertButton"), //ATS警報持続ボタン押下
            isInitialize: dm.getBoolean("ATS-P_East_isInitialize"),             //ATS初期化中
            isActiveATSP: dm.getBoolean("ATS-P_East_isActiveATSP"),             //ATS-P有効化
            isATSPBrake: dm.getBoolean("ATS-P_East_isATSPBrake"),               //ATS-P非常ブレーキ(直下地上子)
            atspMode: dm.getString("ATS-P_East_ATSPMode")                       //ATS-Pモード(東:"East", 西:"West")
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
    var prevPlayingSound = ATS_P_East_SoundManager.get(entity) || {};
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

    //再生終了(ATS切り替え)
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

    //パターン接近ON(ATS-P)
    isPlayingSound[soundList.patternPApproachingOn].push(state.isPatternApproaching);
    //パターン接近OFF(ATS-P)
    isPlayingSound[soundList.patternPApproachingOff].push(!state.isPatternApproaching);
    //パターン抵触(ATS-P)
    var isPattern = state.isATSBrake || state.isPatternBrake || state.isPatternBrakeFull;
    isPlayingSound[soundList.patternPOver].push(isPattern);
    isPlayingSound[soundList.patternPOver].push(!isPattern);
    //ATS確認ボタン押下
    isPlayingSound[soundList.pushButton1].push(state.isAlertButton1Pressed);
    //ATS警報持続ボタン押下
    isPlayingSound[soundList.pushButton2].push(state.isAlertButton2Pressed);
    //初期化終了
    isPlayingSound[soundList.initialize].push(!state.isInitialize);
    //ATS-P有効化
    isPlayingSound[soundList.atsPActivate].push(state.isActiveATSP);
    isPlayingSound[soundList.atsPActivate].push(!state.isActiveATSP);
    //ATS-P切り替え(東→西)
    isPlayingSound[soundList.switchToWest].push(state.atspMode === "West");
    //ATS-P切り替え(西→東)
    isPlayingSound[soundList.switchToEast].push(state.atspMode === "East");

    //ATSブレーキ動作 [ループ音]
    var isATSBrake = state.isATSBrake || state.isATSLongBrake || state.isRollbackBrake || state.isATSPBrake;
    isPlayingSound[loopSoundList.atsPBrake].push(isATSBrake);
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
    ATS_P_East_SoundManager.put(entity, isPlayingSound);
}