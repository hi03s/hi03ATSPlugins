//#################################
//##                             ##
//##  hi03 ATS-Psプラグイン v1.0  ##
//##                             ##
//#################################  最終更新:2026/1/11
/*
1.この関数を音声スクリプトにコピーします
2.onUpdate(su) の中に operationATS_Ps(su); を記述します
3.ユーザー設定で再生する音声の割当を設定します
*/

var ATS_Ps_SoundManager = new java.util.WeakHashMap();
function operationATS_Ps(su, settings) {
    if (!settings) settings = {
        soundList: {},
        loopSoundList: {}
    }
    var ats_id = "ATS-Ps";
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
            isATSBrake: dm.getBoolean("ATS-Ps_isATSBrake"),                 //ATSブレーキ:直下地上子
            isPatternBrake: dm.getBoolean("ATS-Ps_isPatternBrake"),         //ATSブレーキ:パターン抵触
            isATSLongBrake: dm.getBoolean("ATS-Ps_isATSLongBrake"),         //ATSブレーキ:Sn未確認
            isRollbackBrake: dm.getBoolean("ATS-Ps_isRollbackBrake"),       //ATSブレーキ:後退検知
            patternSpeed: dm.getDouble("ATS-Ps_patternSpeed"),              //パターン速度
            isPatternApproaching: dm.getBoolean("ATS-Ps_patternAlert"),     //パターン接近
            isLongAlert: dm.getBoolean("ATS-Ps_isLongAlert"),               //ATS警報ベル(ジリジリ)
            isAtsFault: dm.getBoolean("ATS-Ps_isAtsFault"),                 //Ps故障
            isBrakeDisable: dm.getBoolean("ATS-Ps_isATSBrakeDisable"),      //ブレーキ開放
            hasPattern: dm.getBoolean("ATS-Ps_hasPattern"),                 //パターン発生
            isLongAlertLatched: dm.getBoolean("ATS-Ps_isLongAlertLatched"), //ATS警報持続(キンコン)
            isAlertButton1Pressed: dm.getBoolean("ATS-Ps_acknowledgeAlert"),//ATS確認ボタン押下
            isAlertButton2Pressed: dm.getBoolean("ATS-Ps_pushAlertButton"), //ATS警報持続ボタン押下
            isInitialize: dm.getBoolean("ATS-Ps_isInitialize"),             //ATS初期化中
            maxSpeed: dm.getInt("ATS-Ps_maxSpeed")                          //列車選択スイッチの速度/列車最高速度
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
    var prevPlayingSound = ATS_Ps_SoundManager.get(entity) || {};
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

    //パターン発生
    isPlayingSound[soundList.patternPsStart].push(state.hasPattern);
    //パターン終了
    isPlayingSound[soundList.patternPsEnd].push(!state.hasPattern);
    //パターン接近(ON)
    isPlayingSound[soundList.patternPsApproachingOn].push(state.isPatternApproaching);
    //パターン接近(OFF)
    isPlayingSound[soundList.patternPsApproachingOff].push(!state.isPatternApproaching);
    //パターン抵触
    isPlayingSound[soundList.patternPsOver].push(state.isPatternBrake);
    //ATS確認ボタン押下
    isPlayingSound[soundList.pushButton1].push(state.isAlertButton1Pressed);
    //ATS警報持続ボタン押下
    isPlayingSound[soundList.pushButton2].push(state.isAlertButton2Pressed);

    //ATSブレーキ:直下地上子 [ループ音]
    isPlayingSound[loopSoundList.atsPsBrakeDirect].push(state.isATSBrake);
    //ATSブレーキ:パターン抵触 [ループ音]
    isPlayingSound[loopSoundList.atsPsBrakePattern].push(state.isPatternBrake);
    //ATSブレーキ:Sn未確認 [ループ音]
    isPlayingSound[loopSoundList.atsPsBrakeLong].push(state.isATSLongBrake);
    //ATSブレーキ:後退検知 [ループ音]
    isPlayingSound[loopSoundList.atsPsBrakeRollback].push(state.isRollbackBrake);
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
    ATS_Ps_SoundManager.put(entity, isPlayingSound);
}