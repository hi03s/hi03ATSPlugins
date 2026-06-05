//#################################
//##                             ##
//##  hi03 ATS-Psプラグイン v1.0  ##
//##                             ##
//#################################
function operationATS_Ps(entity, currentATSType, options) {
    if (!entity) return;

    //##  オプション  ##
    //非常ブレーキのノッチ
    var MaxBrakeNotch = options.MaxBrakeNotch || -8;
    //ブレーキパターン減速度[km/h/s]
    var BrakeDeceleration = options.BrakeDeceleration || -2.5;
    //車両の最高速度[km/h]
    var MaxSpeed = options.MaxSpeed || 120;

    var ats_id = "ATS-Ps";

    var _fx = operationATS_Ps._fx;
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
        operationATS_Ps._fx = _fx;
    }

    //#####################
    //###   ATS理論部   ###
    //#####################
    var _ats = operationATS_Ps._ats;
    if (!_ats) {
        _ats = {};
        _ats.resetTime = 60;//tick


        //##  追加関数  ##
        _ats.getPatternSpeed2 = function (BrakeDeceleration, distance, targetSpeed) {
            var decel_ms2 = Math.abs(BrakeDeceleration) / 3.6;
            return (2 * decel_ms2 * distance * 3.6 * 3.6) + (targetSpeed * targetSpeed);
        };

        _ats.getPattern = function (BrakeDeceleration, distance, targetSpeed, minSpeed) {
            if (!minSpeed) minSpeed = 0;
            if (distance === null || targetSpeed === null) return null;
            var alertMinSpeed2 = (minSpeed - 5) * (minSpeed - 5);
            var minSpeed2 = minSpeed * minSpeed;
            if (distance <= 0) {
                return {
                    speed2: minSpeed2,
                    alertSpeed2: alertMinSpeed2
                };
            }
            else {
                return {
                    speed2: Math.max(_ats.getPatternSpeed2(BrakeDeceleration, distance, targetSpeed), minSpeed2),
                    alertSpeed2: Math.max(_ats.getPatternSpeed2(BrakeDeceleration, distance - 50, targetSpeed), alertMinSpeed2)
                };
            }
        };


        //##  ATSを起動したときの初期化処理  ##
        _ats.reset = function (entity, options) {
            var dataMap = entity.getResourceState().getDataMap();
            _fx.setStringSync(dataMap, "ATSDataReceive", "");

            //-- ATS-Sx機能 --
            _fx.setBooleanSync(dataMap, "ATS-Ps_isLongAlertLatched", true);//キンコン音
        };


        //##  ATSがOFFのときの処理(無効化処理)  ##
        _ats.off = function (entity, currentATSType, options) {
            var dataMap = entity.getResourceState().getDataMap();

            //-- ATS-Sx機能 --
            _fx.setBooleanSync(dataMap, "ATS-Ps_isATSBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-Ps_isATSLongBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-Ps_isLongAlert", false);
            _fx.setBooleanSync(dataMap, "ATS-Ps_isAtsFault", false);
            _fx.setBooleanSync(dataMap, "ATS-Ps_isATSBrakeDisable", false);
            _fx.setBooleanSync(dataMap, "ATS-Ps_acknowledgeAlert", false);

            //-- ATS-Ps機能 --
            _fx.setBooleanSync(dataMap, "ATS-Ps_isPatternBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-Ps_isRollbackBrake", false);
            _fx.setDoubleSync(dataMap, "ATS-Ps_PatternSpeed", 0);
            _fx.setBooleanSync(dataMap, "ATS-Ps_patternAlert", false);
            _fx.setBooleanSync(dataMap, "ATS-Ps_hasPattern", false);
        };


        //##  atsStateの初期値  ##
        _ats.atsState = JSON.stringify({
            //-- ATS-Sx機能 --
            preventionTimerTick: 0,
            alertCount: -1,
            disableCount: 0,

            //-- ATS-Ps機能 --
            pattern1: null,
            distance1: null,
            pattern2: null,
            distance2: null,
            pattern3: null,
            distance3: null,
            pattern4: null,
            distance4: null,
            isShunting: false,
            isCallOn: false,
            limitLength: null
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

            //-- ATS-Ps機能 --
            //第1パターン距離減算
            if (atsState.distance1 !== null && atsState.distance1 > -80) atsState.distance1 = atsState.distance1 - speed_m_tick;

            //第2パターン距離減算
            if (atsState.distance2 !== null && atsState.distance2 > -80) atsState.distance2 = atsState.distance2 - speed_m_tick;

            //分岐パターン距離減算(50m走行で解除)
            if (atsState.distance3 !== null && atsState.distance3 > -atsState.limitLength) atsState.distance3 = atsState.distance3 - speed_m_tick;

            //曲線パターン距離減算
            if (atsState.distance4 !== null && atsState.distance4 > 0) atsState.distance4 = atsState.distance4 - speed_m_tick;

            return atsState;//最後にatsStateを返す
        };


        //##  地上子からデータを受信したときの処理  ##
        _ats.receiveData = function (entity, atsState, receiveData, options) {
            var dataMap = entity.getResourceState().getDataMap();
            var world = entity.field_70170_p;
            var worldTick = world.func_82737_E();

            //-- ATS-Sx機能 --
            var isATSBrakeDisable = atsState.disableCount > 0;
            //即時停止
            if (receiveData.stop1 === true && !isATSBrakeDisable) {
                _fx.setBooleanSync(dataMap, "ATS-Ps_isATSBrake", true);
                atsState.pattern2 = null;
                atsState.distance2 = null;
            }

            //即時停止(誤出発防止地上子用)
            if (receiveData.stop2 === true && atsState.preventionTimerTick === 0 && !isATSBrakeDisable) _fx.setBooleanSync(dataMap, "ATS-Ps_isATSBrake", true);

            //誤出発防止タイマー
            if (receiveData.time !== undefined) atsState.preventionTimerTick = receiveData.time;

            //ロング警報
            if (receiveData.alert === true) {
                atsState.alertCount = 5 * 20;//5秒
                _fx.setBooleanSync(dataMap, "ATS-Ps_isLongAlertLatched", true);//警報持続ボタンで解除
                _fx.setIntSync(dataMap, "ATS-Ps_longAlertTick", worldTick);
            }

            //ATS故障
            _fx.setBooleanSync(dataMap, "ATS-Ps_isAtsFault", Boolean(receiveData.isFault));

            //-- ATS-Ps機能 --
            //第1パターン地上子
            if (receiveData.pattern1 !== undefined && receiveData.distance1 !== undefined) {
                atsState.distance1 = receiveData.distance1;
                atsState.pattern1 = receiveData.pattern1;
            }

            //第2パターン地上子
            if (receiveData.pattern2 !== undefined && receiveData.distance2 !== undefined) {
                atsState.distance2 = receiveData.distance2;
                atsState.pattern2 = receiveData.pattern2;
            }

            //分岐パターン地上子
            if (receiveData.pattern3 !== undefined && receiveData.distance3 !== undefined) {
                atsState.distance3 = receiveData.distance3;
                atsState.pattern3 = receiveData.pattern3;
                atsState.limitLength = receiveData.limitLength;
            }

            //曲線パターン地上子
            if (receiveData.pattern4 !== undefined && receiveData.distance4 !== undefined) {
                atsState.distance4 = receiveData.distance4;
                atsState.pattern4 = receiveData.pattern4;
            }

            //入換パターン地上子
            if (receiveData.isShunting !== undefined) atsState.isShunting = receiveData.isShunting;

            //誘導パターン地上子
            if (receiveData.isCallOn === true) atsState.isCallOn = true;

            return atsState;//最後にatsStateを返す
        };


        //##  ATSの動作処理  ##
        _ats.operation = function (entity, atsState) {
            var dataMap = entity.getResourceState().getDataMap();
            var speed_m_tick = entity.getSpeed();//[m/tick]
            var speed = speed_m_tick * 72;//[km/h]
            var absSpeed = Math.abs(speed);
            var speed2 = speed * speed;

            //-- ATS-Sx機能 --
            //ATSブレーキ開放
            var pushBrakeDisableButton = dataMap.getBoolean("ATS-Ps_pushBrakeDisableButton");//ATSブレーキ開放ボタン
            if (pushBrakeDisableButton) atsState.disableCount = 1200;
            var isATSBrakeDisable = atsState.disableCount > 0;
            _fx.setBooleanSync(dataMap, "ATS-Ps_isATSBrakeDisable", isATSBrakeDisable);

            //ATSブレーキ
            var isATSBrake = dataMap.getBoolean("ATS-Ps_isATSBrake");
            if (isATSBrakeDisable) {
                isATSBrake = false;
                _fx.setBooleanSync(dataMap, "ATS-Ps_isATSBrake", false);
            }
            var isATSLongBrake = dataMap.getBoolean("ATS-Ps_isATSLongBrake");
            var isRollbackBrake = dataMap.getBoolean("ATS-Ps_isRollbackBrake");
            var isPatternBrake = dataMap.getBoolean("ATS-Ps_isPatternBrake");
            if ((isATSBrake || isATSLongBrake || isRollbackBrake || isPatternBrake) && absSpeed > 0) {
                entity.setNotch(MaxBrakeNotch);
            }

            //ATSロング警報
            var isAcknowledgeAlert = dataMap.getBoolean("ATS-Ps_acknowledgeAlert");
            if (isAcknowledgeAlert) atsState.alertCount = -1;//確認押下で解除
            else if (atsState.alertCount === 0) {
                _fx.setBooleanSync(dataMap, "ATS-Ps_isATSLongBrake", true);
                atsState.alertCount = -1;
            }
            _fx.setBooleanSync(dataMap, "ATS-Ps_isLongAlert", atsState.alertCount >= 0);

            //-- ATS-Ps機能 --
            //後退検知
            if (speed <= -7 && entity.getTrainStateData(10) === 0) {
                _fx.setBooleanSync(dataMap, "ATS-Ps_isRollbackBrake", true);
            }

            //パターン
            var patternSpeed = MaxSpeed + 10;
            var patternAlert = false;
            var hasPattern = false;
            var hasNormalPattern = false;

            //・最高速度パターン
            patternAlert = patternAlert || (absSpeed > (MaxSpeed + 5));
            isPatternBrake = isPatternBrake || (absSpeed > patternSpeed);

            //・第1パターン
            var pattern1 = _ats.getPattern(BrakeDeceleration, atsState.distance1, 0, atsState.pattern1);
            if (pattern1 !== null) {
                hasPattern = true;
                hasNormalPattern = true;
                patternSpeed = Math.min(patternSpeed, Math.sqrt(pattern1.speed2));
                if (speed2 > pattern1.speed2) isPatternBrake = true;//パターン超過
                patternAlert = patternAlert || (speed2 > pattern1.alertSpeed2);
                if (atsState.distance1 <= -80) {//解除
                    atsState.distance1 = null;
                    atsState.pattern1 = null;
                }
            }

            //・第2パターン
            var pattern2 = _ats.getPattern(BrakeDeceleration, atsState.distance2, 0, atsState.pattern2);
            if (pattern2 !== null) {
                hasPattern = true;
                hasNormalPattern = true;
                patternSpeed = Math.min(patternSpeed, Math.sqrt(pattern2.speed2));
                if (speed2 > pattern2.speed2) isPatternBrake = true;
                patternAlert = patternAlert || (speed2 > pattern2.alertSpeed2);
                if (atsState.distance2 <= -80) {//解除
                    atsState.distance2 = null;
                    atsState.pattern2 = null;
                }
            }

            //・分岐パターン
            var pattern3 = _ats.getPattern(BrakeDeceleration, atsState.distance3, atsState.pattern3, atsState.pattern3);
            if (pattern3 !== null) {
                hasPattern = true;
                patternSpeed = Math.min(patternSpeed, Math.sqrt(pattern3.speed2));
                if (speed2 > pattern3.speed2) isPatternBrake = true;
                patternAlert = patternAlert || (speed2 > pattern3.alertSpeed2);
                if (atsState.distance3 <= -atsState.limitLength) {//解除
                    atsState.distance3 = null;
                    atsState.pattern3 = null;
                    atsState.limitLength = null;
                }
            }

            //・曲線パターン
            var pattern4 = _ats.getPattern(BrakeDeceleration, atsState.distance4, atsState.pattern4, atsState.pattern4);
            if (pattern4 !== null) {
                hasPattern = true;
                patternSpeed = Math.min(patternSpeed, Math.sqrt(pattern4.speed2));
                if (speed2 > pattern4.speed2) isPatternBrake = true;
                patternAlert = patternAlert || (speed2 > pattern4.alertSpeed2);
            }

            //・入換パターン
            if (atsState.isShunting && !hasNormalPattern) {
                hasPattern = true;
                patternSpeed = Math.min(patternSpeed, 30);
                if (absSpeed > 30) isPatternBrake = true;
                patternAlert = patternAlert || (absSpeed > 25);
            }

            //・誘導パターン
            if (atsState.isCallOn) {
                hasPattern = true;
                patternSpeed = Math.min(patternSpeed, 25);
                if (absSpeed > 25) isPatternBrake = true;
                patternAlert = patternAlert || (absSpeed > 20);
            }

            //ブレーキ開放制限
            if (isATSBrakeDisable && absSpeed > 15) entity.setNotch(MaxBrakeNotch);

            //パターン情報同期
            _fx.setDoubleSync(dataMap, "ATS-Ps_PatternSpeed", patternSpeed);
            _fx.setBooleanSync(dataMap, "ATS-Ps_isPatternBrake", isPatternBrake);
            _fx.setBooleanSync(dataMap, "ATS-Ps_patternAlert", patternAlert);
            _fx.setBooleanSync(dataMap, "ATS-Ps_hasPattern", hasPattern);

            return atsState;//最後にatsStateを返す
        };

        operationATS_Ps._ats = _ats;
    }
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
        if ((worldTick - lastTick) < _ats.resetTime) {//初期化中
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
        else atsState = JSON.parse(operationATS_Ps._ats.atsState);

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
                    stop1: true,
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