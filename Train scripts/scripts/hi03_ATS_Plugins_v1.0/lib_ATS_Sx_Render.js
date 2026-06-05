//#################################
//##                             ##
//##  hi03 ATS-Sxプラグイン v1.0  ##
//##                             ##
//#################################
var ATS_Sx_State = function (options) {
    this.Keyboard = Packages.org.lwjgl.input.Keyboard;

    //##  オプション  ##
    //非常ブレーキのノッチ
    this.MaxBrakeNotch = options.MaxBrakeNotch || -8;
    //キー設定
    this.KeyMap = options.KeyMap || {
        //オプションキー
        optionKey: this.Keyboard.KEY_LCONTROL,
        //ATS確認ボタン / [オプションキー同時押し]ATS警報持続ボタン
        atsButton: this.Keyboard.KEY_SPACE,
        //ATS復帰ボタン / [オプションキー同時押し]ブレーキ開放ボタン
        disableButton: this.Keyboard.KEY_BACK,
        //[オプションキー同時押し]ATS切換ボタン (1～9推奨)
        switchButton_sx: this.Keyboard.KEY_1,
        //[オプションキー同時押し]ATS:OFFボタン (0推奨)
        switchButton_off: this.Keyboard.KEY_0
    }
}
ATS_Sx_State.prototype = {
    constructor: ATS_Sx_State,
    onUpdate: function (entity, pass) {
        var ats_id = "ATS-Sx";

        if (!entity) return;
        if (pass !== 0 || renderer.currentMatId !== 0) return;
        var isOldVer = Packages.jp.ngt.rtm.RTMCore.VERSION.indexOf("1.7.10") !== -1;
        var player = Packages.jp.ngt.ngtlib.util.MCWrapperClient.getPlayer();
        var driver = isOldVer ? entity.field_70153_n : entity.func_184187_bx()
        if (driver !== player) return;

        var isAutoATS = false;
        var config = entity.getResourceState().getResourceSet().getConfig();//1.7.10 - 1.12対応
        var customButtons = config.customButtons || null;
        if (!customButtons) isAutoATS = true;
        else {
            var buttonIndex = null;
            for (var i = 0; i < customButtons.length; i++) {
                if (customButtons[i][0] === "ATS:AutoCheck") {//"ATS:AutoCheck"を0番目に持つボタン番号を検索する
                    buttonIndex = i;
                    break;
                }
            }
            if (buttonIndex === null) isAutoATS = true;
            else {
                var buttonId = "Button" + buttonIndex;
                var dataMap = entity.getResourceState().getDataMap();
                var atsIndex = dataMap.getInt(buttonId);
                isAutoATS = atsIndex === 0;
            }
        }

        var dataMap = entity.getResourceState().getDataMap();
        var notch = entity.getNotch();
        var optionKey = this.Keyboard.isKeyDown(this.KeyMap.optionKey);
        var atsButton = this.Keyboard.isKeyDown(this.KeyMap.atsButton);
        var disableButton = this.Keyboard.isKeyDown(this.KeyMap.disableButton);
        var atsSwitchButton1 = this.Keyboard.isKeyDown(this.KeyMap.switchButton_sx);
        var atsSwitchButton2 = this.Keyboard.isKeyDown(this.KeyMap.switchButton_off);
        if (dataMap.getBoolean("ATS-Sx_isInitialize")) return;

        if (isAutoATS) {
            //ATS確認ボタン(自動)
            var world = entity.field_70170_p;
            var worldTick = world.func_82737_E();
            var longAlertTick = dataMap.getInt("ATS-Sx_longAlertTick");
            var isATSAlert = dataMap.getBoolean("ATS-Sx_isLongAlert");
            var isLongAlert = dataMap.getBoolean("ATS-Sx_isLongAlertLatched");
            if (!optionKey && isATSAlert && (worldTick - longAlertTick > 20) && notch < 0) atsButton = true;

            //ATS警報持続ボタン(自動)
            var speed = Math.abs(entity.getSpeed() * 72);
            if (!atsButton && isLongAlert && !isATSAlert && (speed <= 0)) {
                optionKey = true;
                atsButton = true;
            }

            //ATS復帰ボタン(自動)
            var isATSBrake = dataMap.getBoolean("ATS-Sx_isATSBrake");
            var isATSLongBrake = dataMap.getBoolean("ATS-Sx_isATSLongBrake");
            if (!optionKey && !atsButton && (speed <= 0) && notch <= this.MaxBrakeNotch && (isATSBrake || isATSLongBrake)) disableButton = true;
        }

        //ATS確認ボタン
        this._setBooleanSync(dataMap, "ATS-Sx_acknowledgeAlert", atsButton && notch < 0);

        //ATS警報持続ボタン
        if (optionKey && atsButton) this._setBooleanSync(dataMap, "ATS-Sx_isLongAlertLatched", false);
        this._setBooleanSync(dataMap, "ATS-Sx_pushAlertButton", optionKey && atsButton);

        //ATS復帰ボタン
        if (disableButton && (notch <= this.MaxBrakeNotch)) {
            this._setBooleanSync(dataMap, "ATS-Sx_isATSBrake", false);
            this._setBooleanSync(dataMap, "ATS-Sx_isATSLongBrake", false);
        }

        //ブレーキ開放ボタン
        this._setBooleanSync(dataMap, "ATS-Sx_pushBrakeDisableButton", optionKey && disableButton);

        //ATS切換ボタン
        if (optionKey && atsSwitchButton1) dataMap.setString("ATSType", ats_id, 1);
        if (optionKey && atsSwitchButton2) dataMap.setString("ATSType", "ATS:OFF", 1);
    },
    getState: function (entity) {
        if (!entity) return null;
        var dm = entity.getResourceState().getDataMap();
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
    },
    _setBooleanSync: function (dataMap, key, val) {
        var data = dataMap.getBoolean(key);
        if (val !== data) dataMap.setBoolean(key, val, 1);
    }
}