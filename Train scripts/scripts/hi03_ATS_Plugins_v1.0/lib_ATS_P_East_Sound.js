//#################################
//##                             ##
//##  hi03 ATS-Pプラグイン v1.0   ##
//##                             ##
//#################################
/*
1.この関数を音声スクリプトにコピーします
2.onUpdate(su) の中に operationATS_P_East(su); を記述します
3.ユーザー設定で再生する音声の割当を設定します
*/

var ATS_P_East_SoundManager = new java.util.WeakHashMap();
function operationATS_P_East(su) {

    var ats_id = "ATS-P_East";

    //#####################
    //###  ユーザー設定  ###
    //#####################
    var soundList = {
        //パターン接近
        patternApproaching1: "sound_hi03nex_ps:bell1",

        //パターン抵触
        patternApproaching2: "sound_hi03nex_ps:bell1",

        //ATS確認ボタン押下
        pushButton1: "sound_hi03nex_ps:pushButton",

        //ATS警報持続ボタン押下
        pushButton2: "sound_hi03nex_ps:pushButton",

        //初期化完了
        initialize: "sound_hi03nex_ps:bell1",

        //ATS-P有効化
        atspActivate: "sound_hi03nex_ps:bell1",

        //ATS-P切り替え(東→西)
        switchToWest: "sound_hi03nex_ps:bell1",

        //ATS-P切り替え(西→東)
        switchToEast: "sound_hi03nex_ps:bell1"
    };
    var loopSoundList = {
        //ATS非常ブレーキ動作 [ループ音]
        atsBrake1: "sound_hi03nex_ps:ATSPAnnounce",

        //ATS警報ベル(ジリジリ) [ループ音]
        alert1: "sound_hi03nex_ps:bell2",

        //ATS警報持続(キンコン) [ループ音]
        alert2: "sound_hi03nex_ps:bell3"
    };

    //#####################
    //###  ユーザー設定  ###
    //#####################

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
            patternSpeed: dm.getDouble("ATS-P_East_PatternSpeed"),              //パターン速度
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

    //パターン接近
    isPlayingSound[soundList.patternApproaching1].push(state.isPatternApproaching);
    isPlayingSound[soundList.patternApproaching1].push(!state.isPatternApproaching);
    //パターン抵触
    var isPattern = state.isATSBrake || state.isPatternBrake || state.isPatternBrakeFull;
    isPlayingSound[soundList.patternApproaching2].push(isPattern);
    isPlayingSound[soundList.patternApproaching2].push(!isPattern);
    //ATS確認ボタン押下
    isPlayingSound[soundList.pushButton1].push(state.isAlertButton1Pressed);
    //ATS警報持続ボタン押下
    isPlayingSound[soundList.pushButton2].push(state.isAlertButton2Pressed);
    //初期化終了
    isPlayingSound[soundList.initialize].push(!state.isInitialize);
    //ATS-P有効化
    isPlayingSound[soundList.atspActivate].push(state.isActiveATSP);
    isPlayingSound[soundList.atspActivate].push(!state.isActiveATSP);
    //ATS-P切り替え(東→西)
    isPlayingSound[soundList.switchToWest].push(state.atspMode === "West");
    //ATS-P切り替え(西→東)
    isPlayingSound[soundList.switchToEast].push(state.atspMode === "East");

    //ATSブレーキ動作 [ループ音]
    var isATSBrake = state.isATSBrake || state.isATSLongBrake || state.isRollbackBrake || state.isATSPBrake;
    isPlayingSound[loopSoundList.atsBrake1].push(isATSBrake);
    //ATS警報ベル(ジリジリ) [ループ音]
    isPlayingSound[loopSoundList.alert1].push(state.isLongAlert || state.isInitialize);
    //ATS警報持続(キンコン) [ループ音]
    isPlayingSound[loopSoundList.alert2].push(state.isLongAlertLatched);

    //再生(非ループ)
    for (var i = 0; i < soundListKeys.length; i++) {
        var soundName = soundList[soundListKeys[i]];
        if (shouldPlaySound(isPlayingSound[soundName], prevPlayingSound[soundName])) {
            var sound = soundName.split(":");
            su.stopSound(sound[0], sound[1]);
            su.playSound(sound[0], sound[1], 1, 1, false);
        }
    }
    //再生(ループ)
    for (var i = 0; i < loopSoundListKeys.length; i++) {
        var soundName = loopSoundList[loopSoundListKeys[i]];
        var sound = soundName.split(":");
        if (anyPlaySound(isPlayingSound[soundName])) su.playSound(sound[0], sound[1], 1, 1, true);
        else su.stopSound(sound[0], sound[1]);
    }

    //フラグ保存
    ATS_P_East_SoundManager.put(entity, isPlayingSound);
}