//#################################
//##                             ##
//##  hi03 ATS-Sxプラグイン v1.0  ##
//##                             ##
//#################################
function operationATS_Sx(entity, currentATSType, options) {
    if (!entity) return;
    if (!options) options = {
        MaxBrakeNotch: -8,
        BrakeDeceleration: -2.5,
        MaxSpeed: 130,
        IsOldType: false
    }

    //##  オプション  ##
    //非常ブレーキのノッチ
    var MaxBrakeNotch = options.MaxBrakeNotch || -8;

    var ats_id = "ATS-Sx";

    var _fx = operationATS_Sx._fx;
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
        operationATS_Sx._fx = _fx;
    }

    //#####################
    //###   ATS理論部   ###
    //#####################
    var _ats = operationATS_Sx._ats;
    if (!_ats) {
        _ats = {};
        _ats.resetTime = 60;//tick


        //##  ATSを起動したときの初期化処理  ##
        _ats.reset = function (entity, options) {
            var dataMap = entity.getResourceState().getDataMap();
            _fx.setStringSync(dataMap, "ATSDataReceive", "");

            //-- ATS-Sx機能 --
            _fx.setBooleanSync(dataMap, "ATS-Sx_isLongAlertLatched", true);//キンコン音
        };


        //##  ATSがOFFのときの処理(無効化処理)  ##
        _ats.off = function (entity, currentATSType, options) {
            var dataMap = entity.getResourceState().getDataMap();
            
            //-- ATS-Sx機能 --
            _fx.setBooleanSync(dataMap, "ATS-Sx_isATSBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-Sx_isATSLongBrake", false);
            _fx.setBooleanSync(dataMap, "ATS-Sx_isLongAlert", false);
            _fx.setBooleanSync(dataMap, "ATS-Sx_isAtsFault", false);
            _fx.setBooleanSync(dataMap, "ATS-Sx_isATSBrakeDisable", false);
            _fx.setBooleanSync(dataMap, "ATS-Sx_acknowledgeAlert", false);
        };


        //##  atsStateの初期値  ##
        _ats.atsState = JSON.stringify({
            //-- ATS-Sx機能 --
            preventionTimerTick: 0,
            alertCount: -1,
            disableCount: 0
        });


        //##  atsStateの更新処理  ##
        _ats.onUpdate = function (entity, atsState, options) {
            var dataMap = entity.getResourceState().getDataMap();
            
            ///-- ATS-Sx機能 --
            //誤出発防止タイマー減算
            if (atsState.preventionTimerTick > 0) atsState.preventionTimerTick -= 1;

            //ロング警報カウントダウン
            if (atsState.alertCount > 0) atsState.alertCount -= 1;

            //ATS開放カウント
            if (0 < atsState.disableCount && atsState.disableCount < 1200) atsState.disableCount -= 1;
            if (atsState.disableCount === 1200 && entity.getNotch() > 0) atsState.disableCount = 1199;//Pノッチ投入でタイマー起動

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
            if (receiveData.stop1 === true && !isATSBrakeDisable) _fx.setBooleanSync(dataMap, "ATS-Sx_isATSBrake", true);

            //即時停止(誤出発防止地上子用)
            if (receiveData.stop2 === true && atsState.preventionTimerTick === 0 && !isATSBrakeDisable) _fx.setBooleanSync(dataMap, "ATS-Sx_isATSBrake", true);

            //誤出発防止タイマー
            if (receiveData.time !== undefined) atsState.preventionTimerTick = receiveData.time;

            //ロング警報
            if (receiveData.alert === true) {
                atsState.alertCount = 5 * 20;//5秒
                _fx.setBooleanSync(dataMap, "ATS-Sx_isLongAlertLatched", true);//警報持続ボタンで解除
                _fx.setIntSync(dataMap, "ATS-Sx_longAlertTick", worldTick);
            }

            //ATS故障
            _fx.setBooleanSync(dataMap, "ATS-Sx_isAtsFault", Boolean(receiveData.isFault));

            return atsState;//最後にatsStateを返す
        };


        //##  ATSの動作処理  ##
        _ats.operation = function (entity, atsState, options) {
            var dataMap = entity.getResourceState().getDataMap();
            
            //-- ATS-Sx機能 --
            var absSpeed = Math.abs(entity.getSpeed() * 72);
            
            //ATSブレーキ開放
            var pushBrakeDisableButton = dataMap.getBoolean("ATS-Sx_pushBrakeDisableButton");//ATSブレーキ開放ボタン
            if (pushBrakeDisableButton) atsState.disableCount = 1200;
            var isATSBrakeDisable = atsState.disableCount > 0;
            _fx.setBooleanSync(dataMap, "ATS-Sx_isATSBrakeDisable", isATSBrakeDisable);

            //ATSブレーキ
            var isATSBrake = dataMap.getBoolean("ATS-Sx_isATSBrake");
            if (isATSBrakeDisable) {
                isATSBrake = false;
                _fx.setBooleanSync(dataMap, "ATS-Sx_isATSBrake", false);
            }
            var isATSLongBrake = dataMap.getBoolean("ATS-Sx_isATSLongBrake");
            if ((isATSBrake || isATSLongBrake) && absSpeed > 0) {
                entity.setNotch(MaxBrakeNotch);
            }

            //ATSロング警報
            var isAcknowledgeAlert = dataMap.getBoolean("ATS-Sx_acknowledgeAlert");
            if (isAcknowledgeAlert) atsState.alertCount = -1;//確認押下で解除
            else if (atsState.alertCount === 0) {
                _fx.setBooleanSync(dataMap, "ATS-Sx_isATSLongBrake", true);
                atsState.alertCount = -1;
            }
            _fx.setBooleanSync(dataMap, "ATS-Sx_isLongAlert", atsState.alertCount >= 0);


            return atsState;//最後にatsStateを返す
        };

        operationATS_Sx._ats = _ats;
    }
    //#####################
    //###   ATS理論部   ###
    //#####################

    var world = entity.field_70170_p;
    var worldTick = world.func_82737_E();
    var dataMap = entity.getResourceState().getDataMap();

    if (ats_id !== currentATSType) {
        _ats.off(entity, currentATSType, options);
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
            _ats.reset(entity, options);
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
        else atsState = JSON.parse(operationATS_Sx._ats.atsState);

        //atsState更新
        atsState = _ats.onUpdate(entity, atsState, options);

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
            atsState = _ats.receiveData(entity, atsState, receiveData, options);
            //受信データ消去
            dataMap.setString("ATSDataReceive", "", 1);
        }

        //動作処理
        atsState = _ats.operation(entity, atsState, options);

        //保存
        var saveDataJson = JSON.stringify(atsState).replace(/,/g, "☆");
        if (saveDataJson !== atsStateJson) dataMap.setString(ats_id + "_ATSState", saveDataJson, 0);

        //ATS機能継続
        dataMap.setInt(ats_id + "_lastTick", worldTick, 0);
    }
}