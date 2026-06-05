//#################################
//##                             ##
//##  hi03 ATS-Pプラグイン v1.0   ##
//##                             ##
//#################################
function operationATS_P_East(entity, currentATSType, options) {
    if (!entity) return;

    //##  オプション  ##
    //非常ブレーキのノッチ
    var MaxBrakeNotch = options.MaxBrakeNotch || -8;
    //ブレーキパターン減速度[km/h/s]
    var BrakeDeceleration = options.BrakeDeceleration || -2.5;
    //車両の最高速度[km/h]
    var MaxSpeed = options.MaxSpeed || 130;
    //ATS切り替えタイプ 主に115系や211系などの古い車両向け
    var IsOldType = options.IsOldType || false;

    var ats_id = "ATS-P_East";

    var _fx = operationATS_P_East._fx;
    if (!_fx) {
        _fx = {};
        _fx.setBooleanSync = function (dataMap, key, val) {
            var data = dataMap.getBoolean(key);
            if (val !== data) dataMap.setBoolean(key, val, 1);
        }
        _fx.setDoubleSync = function (dataMap, key, val) {
            var data = dataMap.getDouble(key);
            if (val !== data) dataMap.setDouble(key, val, 1);
        }
        _fx.setStringSync = function (dataMap, key, val) {
            var data = dataMap.getString(key);
            if (val !== data) dataMap.setString(key, val, 1);
        }
        _fx.setIntSync = function (dataMap, key, val) {
            var data = dataMap.getInt(key);
            if (val !== data) dataMap.setInt(key, val, 1);
        }
        operationATS_P_East._fx = _fx;
    }

    //#####################
    //###   ATS理論部   ###
    //#####################
    var _ats = operationATS_P_East._ats;
    if (!_ats) {
        _ats = {};
        _ats.resetTime = 10;//tick
        _ats.resetTime_Sx = 60;//tick


        //##  ATSを起動したときの初期化処理  ##
        _ats.reset = function (entity, options) {
            var dataMap = entity.getResourceState().getDataMap();
            _fx.setStringSync(dataMap, "ATSDataReceive", "");

            //-- ATS-Sx機能 --
            _fx.setBooleanSync(dataMap, "ATS-P_East_isLongAlertLatched", true);//キンコン音

            //-- ATS-P機能 --
            _fx.setStringSync(dataMap, "ATS-P_East_ATSPMode", "East");
        };


        //##  ATSがOFFのときの処理(無効化処理)  ##
        _ats.off = function (entity, currentATSType, options) {
            var dataMap = entity.getResourceState().getDataMap();

            //-- ATS-Sx機能 --
            _fx.setBooleanSync(dataMap, "ATS-P_East_isATSBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isATSLongBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isLongAlert", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isAtsFault", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isATSBrakeDisable", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_acknowledgeAlert", false);

            //-- ATS-P機能 --
            _fx.setBooleanSync(dataMap, "ATS-P_East_isActiveATSP", false);
            _fx.setStringSync(dataMap, "ATS-P_East_ATSPMode", "");
            _fx.setDoubleSync(dataMap, "ATS-P_East_PatternSpeed", 0);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isPatternBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_patternAlert", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isPatternBrakeFull", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isRollbackBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isATSPBrake", false);
        };


        //##  atsStateの初期値  ##
        _ats.atsState = JSON.stringify({
            //-- ATS-Sx機能 --
            preventionTimerTick: 0,
            alertCount: -1,
            disableCount: 0,

            //-- ATS-P機能 --
            pattern: {}
        });


        //##  atsStateの更新処理  ##
        _ats.onUpdate = function (entity, atsState, options) {
            var dataMap = entity.getResourceState().getDataMap();
            var speed_m_tick = entity.getSpeed();//[m/tick]

            ///-- ATS-Sx機能 --
            //誤出発防止タイマー減算
            if (atsState.preventionTimerTick > 0) atsState.preventionTimerTick -= 1;

            //ロング警報カウントダウン
            if (atsState.alertCount > 0) atsState.alertCount -= 1;

            //ATS開放カウント
            if (0 < atsState.disableCount && atsState.disableCount < 1200) atsState.disableCount -= 1;
            if (atsState.disableCount === 1200 && entity.getNotch() > 0) atsState.disableCount = 1199;//Pノッチ投入でタイマー起動

            //-- ATS-P機能 --
            //atsState.patternのdistance、lengthを減算
            var patternKeys = Object.keys(atsState.pattern);
            for (var i = 0; i < patternKeys.length; i++) {
                var patternId = patternKeys[i];//atsState.pattern[patternKeys[i]];
                var pattern = atsState.pattern[patternId];
                if (pattern === null) continue;
                if (pattern.distance > 0) atsState.pattern[patternId].distance = Math.max(0, pattern.distance - speed_m_tick);
                else if (pattern.distance === 0) {
                    if (pattern.length > 0) atsState.pattern[patternId].length = Math.max(0, pattern.length - speed_m_tick);
                    else if (pattern.length === 0) atsState.pattern[patternId] = null;
                }
            }

            return atsState;//最後にatsStateを返す
        };


        //##  地上子からデータを受信したときの処理  ##
        _ats.receiveData = function (entity, atsState, receiveData, options) {
            var dataMap = entity.getResourceState().getDataMap();
            var world = entity.field_70170_p;
            var worldTick = world.func_82737_E();
            var isActiveATSP = dataMap.getBoolean("ATS-P_East_isActiveATSP");
            var ATSPMode = dataMap.getString("ATS-P_East_ATSPMode");
            var isATSBrakeDisable = atsState.disableCount > 0;

            //ATS-P地上子識別
            if (receiveData.atsType === "ATS-P") {
                _fx.setBooleanSync(dataMap, "ATS-P_East_isActiveATSP", true);
                isActiveATSP = true;
            }

            //-- ATS-Sx機能 --
            if ((ATSPMode === "East" && !isActiveATSP) || ATSPMode === "West") {//東モード:ATS-P動作時はSx無効、西モード:ATS-P・Sx併用
                //即時停止
                if (receiveData.stop1 === true && !isATSBrakeDisable) _fx.setBooleanSync(dataMap, "ATS-P_East_isATSBrake", true);

                //即時停止(誤出発防止地上子用)
                if (receiveData.stop2 === true && atsState.preventionTimerTick === 0 && !isATSBrakeDisable) _fx.setBooleanSync(dataMap, "ATS-P_East_isATSBrake", true);

                //誤出発防止タイマー
                if (receiveData.time !== undefined) atsState.preventionTimerTick = receiveData.time;

                //ロング警報
                if (receiveData.alert === true) {
                    atsState.alertCount = 5 * 20;//5秒
                    _fx.setBooleanSync(dataMap, "ATS-P_East_isLongAlertLatched", true);//警報持続ボタンで解除
                    _fx.setIntSync(dataMap, "ATS-P_East_longAlertTick", worldTick);
                }

                //ATS故障
                _fx.setBooleanSync(dataMap, "ATS-P_East_isAtsFault", Boolean(receiveData.isFault));

                //ATS切り替え受信
                if (receiveData.switch) {
                    //ATS-P切り替え(西モード)
                    if (receiveData.switch === "EtoW") {
                        _fx.setStringSync(dataMap, "ATS-P_East_ATSPMode", "West");
                        _fx.setBooleanSync(dataMap, "ATS-P_East_isActiveATSP", true);
                    }
                }
            }

            //-- ATS-P機能 --
            if (isActiveATSP) {
                //即時停止
                if (receiveData.stop === true && !isATSBrakeDisable) _fx.setBooleanSync(dataMap, "ATS-P_East_isATSPBrake", true);

                //パターン受信
                if (receiveData.id) {
                    if (!atsState.pattern[receiveData.id]) {
                        atsState.pattern[receiveData.id] = {};
                    }
                    atsState.pattern[receiveData.id].speed = receiveData.speed;
                    if (receiveData.distance !== -1) atsState.pattern[receiveData.id].distance = receiveData.distance;
                    atsState.pattern[receiveData.id].length = receiveData.length;
                }

                //パターン終了
                if (receiveData.releaseId && atsState.pattern[receiveData.releaseId]) atsState.pattern[receiveData.releaseId] = null;

                //入換パターン終了
                if (receiveData.releaseShunting) atsState.pattern["Shunting"] = null;

                //ATS切り替え受信
                if (receiveData.switch) {
                    //ATS-P終了
                    if (receiveData.switch === "End") {
                        _fx.setBooleanSync(dataMap, "ATS-P_East_isActiveATSP", false);
                        atsState.pattern = {};
                        if (IsOldType) {
                            _fx.setIntSync(dataMap, ats_id + "_lastTick", 0);
                            _fx.setBooleanSync(dataMap, ats_id + "_isInitialize", true);
                        }
                    }

                    //ATS-P切り替え(西モード)
                    else if (receiveData.switch === "EtoW") {
                        _fx.setStringSync(dataMap, "ATS-P_East_ATSPMode", "West");
                        _fx.setBooleanSync(dataMap, "ATS-P_East_isActiveATSP", true);
                    }

                    //ATS-P切り替え(東モード)
                    else if (receiveData.switch === "WtoE") {
                        _fx.setStringSync(dataMap, "ATS-P_East_ATSPMode", "East");
                        _fx.setBooleanSync(dataMap, "ATS-P_East_isActiveATSP", true);
                    }
                }
            }

            return atsState;//最後にatsStateを返す
        }
    };


    //##  ATSの動作処理  ##
    _ats.operation = function (entity, atsState, options) {
        var dataMap = entity.getResourceState().getDataMap();
        var speed_m_tick = entity.getSpeed();//[m/tick]
        var speed = speed_m_tick * 72;//[km/h]
        var absSpeed = Math.abs(speed);
        var speed2 = speed * speed;

        //-- ATS-Sx機能 --
        //ATSブレーキ開放
        var pushBrakeDisableButton = dataMap.getBoolean("ATS-P_East_pushBrakeDisableButton");//ATSブレーキ開放ボタン
        if (pushBrakeDisableButton) atsState.disableCount = 1200;
        var isATSBrakeDisable = atsState.disableCount > 0;
        _fx.setBooleanSync(dataMap, "ATS-P_East_isATSBrakeDisable", isATSBrakeDisable);

        //ATSブレーキ(非常)
        var isATSBrake = dataMap.getBoolean("ATS-P_East_isATSBrake");
        var isATSPBrake = dataMap.getBoolean("ATS-P_East_isATSPBrake");
        if (isATSBrakeDisable) {
            isATSBrake = false;
            isATSPBrake = false;
            _fx.setBooleanSync(dataMap, "ATS-P_East_isATSBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-P_East_isATSPBrake", false);
        }
        var isATSLongBrake = dataMap.getBoolean("ATS-P_East_isATSLongBrake");
        var isRollbackBrake = dataMap.getBoolean("ATS-P_East_isRollbackBrake");
        if ((isATSPBrake || isATSBrake || isATSLongBrake || isRollbackBrake) && absSpeed > 0) {
            entity.setNotch(MaxBrakeNotch);
        }

        //ATSロング警報
        var isAcknowledgeAlert = dataMap.getBoolean("ATS-P_East_acknowledgeAlert");
        if (isAcknowledgeAlert) atsState.alertCount = -1;//確認押下で解除
        else if (atsState.alertCount === 0) {
            _fx.setBooleanSync(dataMap, "ATS-P_East_isATSLongBrake", true);
            atsState.alertCount = -1;
        }
        _fx.setBooleanSync(dataMap, "ATS-P_East_isLongAlert", atsState.alertCount >= 0);

        //-- ATS-P機能 --
        var patternSpeed = dataMap.getDouble("ATS-P_East_PatternSpeed");

        //後退検知
        if (speed <= -7 && entity.getTrainStateData(10) === 0) {
            _fx.setBooleanSync(dataMap, "ATS-P_East_isRollbackBrake", true);
        }

        //ATS常用最大ブレーキ(停車まで)
        var isPatternBrakeFull = dataMap.getBoolean("ATS-P_East_isPatternBrakeFull");
        if (isPatternBrakeFull && absSpeed > 0) {
            entity.setNotch(MaxBrakeNotch + 1);
        }

        //ATS常用最大ブレーキ
        var isPatternBrake = dataMap.getBoolean("ATS-P_East_isPatternBrake");
        if (isPatternBrake && absSpeed > 0) {
            if (absSpeed < (patternSpeed - 10)) {
                _fx.setBooleanSync(dataMap, "ATS-P_East_isPatternBrake", false);
                entity.setNotch(0);
            }
            else entity.setNotch(MaxBrakeNotch + 1);
        }

        //パターン演算
        var patternKeys = Object.keys(atsState.pattern);
        patternSpeed = MaxSpeed + 10;//最高速度パターン
        var patternAlertSpeed2 = MaxSpeed * MaxSpeed;
        var isFullStop = false;//停車までブレーキ
        for (var i = 0; i < patternKeys.length; i++) {
            var pattern = atsState.pattern[patternKeys[i]];
            if (!pattern) continue;
            var limitSpeed = pattern.speed;
            var limitMinSpeed2 = (limitSpeed - 10) * (limitSpeed - 10);
            var limitDistance = pattern.distance;
            if (limitDistance === 0) {//制限区間内
                if (limitSpeed < patternSpeed) {
                    patternSpeed = limitSpeed;
                    patternAlertSpeed2 = limitMinSpeed2;
                    isFullStop = pattern.speed === 15;//15パターンは停止現示パターンのみ
                }
            }
            else {//制限区間前
                if (isPatternBrake) {//パターン抵触中は制限速度まで落とす
                    patternSpeed = limitSpeed;
                    patternAlertSpeed2 = limitMinSpeed2;
                    isFullStop = pattern.speed === 15;
                }
                else {
                    var decel_ms2 = Math.abs(BrakeDeceleration) / 3.6;
                    var patternSpeed2 = Math.max((2 * decel_ms2 * limitDistance * 3.6 * 3.6) + (limitSpeed * limitSpeed), limitSpeed * limitSpeed);
                    if (patternSpeed2 < (patternSpeed * patternSpeed)) {
                        patternSpeed = Math.sqrt(patternSpeed2);
                        patternAlertSpeed2 = Math.max((2 * decel_ms2 * (limitDistance - 50) * 3.6 * 3.6) + (limitSpeed * limitSpeed), limitMinSpeed2);
                        isFullStop = pattern.speed === 15;
                    }
                }
            }
        }

        //ブレーキ開放制限
        if (isATSBrakeDisable && absSpeed > 15) entity.setNotch(MaxBrakeNotch);

        //パターン情報同期
        _fx.setDoubleSync(dataMap, "ATS-P_East_PatternSpeed", patternSpeed);
        if (absSpeed > patternSpeed) {
            if (isFullStop) _fx.setBooleanSync(dataMap, "ATS-P_East_isPatternBrakeFull", true);
            else _fx.setBooleanSync(dataMap, "ATS-P_East_isPatternBrake", true);
        }
        _fx.setBooleanSync(dataMap, "ATS-P_East_patternAlert", (speed2 > patternAlertSpeed2));

        return atsState;//最後にatsStateを返す
    };

    operationATS_P_East._ats = _ats;

    //#####################
    //###   ATS理論部   ###
    //#####################

    var world = entity.field_70170_p;
    var worldTick = world.func_82737_E();
    var dataMap = entity.getResourceState().getDataMap();

    if (ats_id !== currentATSType) {
        _ats.off(entity);
        _fx.setIntSync(dataMap, ats_id + "_lastTick", 0);
        _fx.setBooleanSync(dataMap, ats_id + "_isInitialize", false);
        _fx.setStringSync(dataMap, ats_id + "_ATSState", "");
        return;
    }

    //デフォルトATS無効化
    entity.atsCount = 0;

    //初期化検知
    var lastTick = dataMap.getInt(ats_id + "_lastTick");
    var isInitialize = dataMap.getBoolean(ats_id + "_isInitialize");
    if (!isInitialize && lastTick === 0) {//初期化を実施
        isInitialize = true;
        lastTick = worldTick;
        _fx.setBooleanSync(dataMap, ats_id + "_isInitialize", true);
        dataMap.setInt(ats_id + "_lastTick", lastTick, 0);
    }
    if (isInitialize) {
        var resetTime = IsOldType ? _ats.resetTime_Sx : _ats.resetTime;
        if ((worldTick - lastTick) < resetTime) {//初期化中
            _ats.reset(entity);
        }
        else {//初期化完了
            _fx.setBooleanSync(dataMap, ats_id + "_isInitialize", false);
            dataMap.setInt(ats_id + "_lastTick", worldTick, 0);
        }
    }
    else {
        var atsState = {};
        var atsStateJson = dataMap.getString(ats_id + "_ATSState");
        if (atsStateJson !== "") atsState = JSON.parse(atsStateJson.replace(/☆/g, ","));
        else atsState = JSON.parse(operationATS_P_East._ats.atsState);

        //atsState更新
        atsState = _ats.onUpdate(entity, atsState);

        //データ受信
        var receiveDataJson = dataMap.getString("ATSDataReceive").replace(/☆/g, ",");
        if (receiveDataJson !== "") {
            var receiveData = null;
            try { receiveData = JSON.parse(receiveDataJson); }
            catch (e) {
                receiveData = {
                    atsType: ats_id,
                    stop: true,
                    isFault: true
                };
            }
            atsState = _ats.receiveData(entity, atsState, receiveData);
            //受信データ消去
            dataMap.setString("ATSDataReceive", "", 1);
        }

        //動作処理
        atsState = _ats.operation(entity, atsState);

        //保存
        var saveDataJson = JSON.stringify(atsState).replace(/,/g, "☆");
        if (saveDataJson !== atsStateJson) dataMap.setString(ats_id + "_ATSState", saveDataJson, 0);

        //ATS機能継続
        dataMap.setInt(ats_id + "_lastTick", worldTick, 0);
    }
}