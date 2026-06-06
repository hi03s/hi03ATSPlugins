//#####################################
//##                                 ##
//##  hi03 ATS-P・Psプラグイン v1.0   ##
//##                                 ##
//#####################################
var ATS_P_Ps_State = function (options) {
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
        //[オプションキー同時押し]ATS切換ボタン
        switchButton_p_ps: this.Keyboard.KEY_1,
        //[オプションキー同時押し]ATS:OFFボタン
        switchButton_off: this.Keyboard.KEY_0
    }

    this.parts = {
        body: renderer.registerParts(new Parts("ATS-Ps_body")),
        normal: renderer.registerParts(new Parts("ATS-Ps_normal")),
        patternOver: renderer.registerParts(new Parts("ATS-Ps_patternOver")),
        longBrake: renderer.registerParts(new Parts("ATS-Ps_longBrake")),
        directBrake: renderer.registerParts(new Parts("ATS-Ps_directBrake")),
        rollbackBrake: renderer.registerParts(new Parts("ATS-Ps_rollbackBrake")),
        powerP: renderer.registerParts(new Parts("ATS-Ps_powerP")),
        pattern: renderer.registerParts(new Parts("ATS-Ps_pattern")),
        brake: renderer.registerParts(new Parts("ATS-Ps_brake")),
        disable: renderer.registerParts(new Parts("ATS-Ps_disable")),
        patternP: renderer.registerParts(new Parts("ATS-Ps_patternP")),
        patternPs: renderer.registerParts(new Parts("ATS-Ps_patternPs")),
        failureP: renderer.registerParts(new Parts("ATS-Ps_failureP")),
        failurePs: renderer.registerParts(new Parts("ATS-Ps_failurePs")),
        meter0: renderer.registerParts(new Parts("ATS-Ps_meter0")),
        meter1: renderer.registerParts(new Parts("ATS-Ps_meter1")),
        meter2: renderer.registerParts(new Parts("ATS-Ps_meter2"))
    }
}
ATS_P_Ps_State.prototype = {
    constructor: ATS_P_Ps_State,
    onUpdate: function (entity, pass) {
        var ats_id = "ATS-P_Ps";

        if (!entity) return;
        if (pass !== 0 || renderer.currentMatId !== 0) return;
        var isOldVer = Packages.jp.ngt.rtm.RTMCore.VERSION.indexOf("1.7.10") !== -1;
        var player = Packages.jp.ngt.ngtlib.util.MCWrapperClient.getPlayer();
        var driver = isOldVer ? entity.field_70153_n : entity.func_184187_bx()
        if (driver !== player) return;

        var isAutoATS = function () {
            var config = entity.getResourceState().getResourceSet().getConfig();//1.7.10 - 1.12対応
            var customButtons = config.customButtons || null;
            if (!customButtons) return true;
            var buttonIndex = null;
            for (var i = 0; i < customButtons.length; i++) {
                if (customButtons[i][0] === "ATS:AutoCheck") {//"ATS:AutoCheck"を0番目に持つボタン番号を検索する
                    buttonIndex = i;
                    break;
                }
            }
            if (buttonIndex === null) return true;
            var buttonId = "Button" + buttonIndex;
            var dataMap = entity.getResourceState().getDataMap();
            var atsIndex = dataMap.getInt(buttonId);
            return atsIndex === 0;
        }();

        var dataMap = entity.getResourceState().getDataMap();
        var notch = entity.getNotch();
        var optionKey = this.Keyboard.isKeyDown(this.KeyMap.optionKey);
        var atsButton = this.Keyboard.isKeyDown(this.KeyMap.atsButton);
        var disableButton = this.Keyboard.isKeyDown(this.KeyMap.disableButton);
        var atsSwitchButton1 = this.Keyboard.isKeyDown(this.KeyMap.switchButton_p_ps);
        var atsSwitchButton2 = this.Keyboard.isKeyDown(this.KeyMap.switchButton_off);
        if (dataMap.getBoolean("ATS-P_Ps_isInitialize")) return;

        if (isAutoATS) {
            //ATS確認ボタン(自動)
            var world = entity.field_70170_p;
            var worldTick = world.func_82737_E();
            var longAlertTick = dataMap.getInt("ATS-P_Ps_longAlertTick");
            var isATSAlert = dataMap.getBoolean("ATS-P_Ps_isLongAlert");
            var isLongAlert = dataMap.getBoolean("ATS-P_Ps_isLongAlertLatched");
            if (!optionKey && isATSAlert && (worldTick - longAlertTick > 20) && notch < 0) atsButton = true;

            //ATS警報持続ボタン(自動)
            var speed = Math.abs(entity.getSpeed() * 72);
            if (!atsButton && isLongAlert && !isATSAlert && (speed <= 0)) {
                optionKey = true;
                atsButton = true;
            }

            //ATS復帰ボタン(自動)
            var isATSBrake = dataMap.getBoolean("ATS-P_Ps_isATSBrake");
            var isATSPBrake = dataMap.getBoolean("ATS-P_Ps_isATSPBrake");
            var isATSLongBrake = dataMap.getBoolean("ATS-P_Ps_isATSLongBrake");
            var isPatternBrake = dataMap.getBoolean("ATS-P_Ps_isPatternBrake");
            var isPatternBrakeFull = dataMap.getBoolean("ATS-P_Ps_isPatternBrakeFull");
            var isRollbackBrake = dataMap.getBoolean("ATS-P_Ps_isRollbackBrake");
            var isPatternBrake_Ps = dataMap.getBoolean("ATS-P_Ps_isPatternBrake_Ps");
            var isBrake = isATSBrake || isATSPBrake || isATSLongBrake || isPatternBrake || isPatternBrakeFull || isRollbackBrake || isPatternBrake_Ps;
            if (!optionKey && !atsButton && (speed <= 0) && notch <= this.MaxBrakeNotch && isBrake) disableButton = true;
        }

        //ATS確認ボタン
        this._setBooleanSync(dataMap, "ATS-P_Ps_acknowledgeAlert", atsButton && notch < 0);

        //ATS警報持続ボタン
        if (optionKey && atsButton) this._setBooleanSync(dataMap, "ATS-P_Ps_isLongAlertLatched", false);
        this._setBooleanSync(dataMap, "ATS-P_Ps_pushAlertButton", optionKey && atsButton);

        //ATS復帰ボタン
        if (disableButton && (notch <= this.MaxBrakeNotch)) {
            this._setBooleanSync(dataMap, "ATS-P_Ps_isATSBrake", false);
            this._setBooleanSync(dataMap, "ATS-P_Ps_isATSPBrake", false);
            this._setBooleanSync(dataMap, "ATS-P_Ps_isATSLongBrake", false);
            this._setBooleanSync(dataMap, "ATS-P_Ps_isPatternBrake", false);
            this._setBooleanSync(dataMap, "ATS-P_Ps_isPatternBrakeFull", false);
            this._setBooleanSync(dataMap, "ATS-P_Ps_isRollbackBrake", false);
            this._setBooleanSync(dataMap, "ATS-P_Ps_isPatternBrake_Ps", false);
        }

        //ブレーキ開放ボタン
        this._setBooleanSync(dataMap, "ATS-P_Ps_pushBrakeDisableButton", optionKey && disableButton);

        //ATS切換ボタン
        if (optionKey && atsSwitchButton1) dataMap.setString("ATSType", ats_id, 1);
        if (optionKey && atsSwitchButton2) dataMap.setString("ATSType", "ATS:OFF", 1);
    },
    getState: function (entity) {
        if (!entity) return null;
        var dm = entity.getResourceState().getDataMap();
        return {
            isInitialize: dm.getBoolean("ATS-P_Ps_isInitialize"),             //ATS初期化中
            isLongAlert: dm.getBoolean("ATS-P_Ps_isLongAlert"),               //ATS警報ベル(ジリジリ)
            isLongAlertLatched: dm.getBoolean("ATS-P_Ps_isLongAlertLatched"), //ATS警報持続(キンコン)
            isAtsFault: dm.getBoolean("ATS-P_Ps_isAtsFault"),                 //Ps故障
            isBrakeDisable: dm.getBoolean("ATS-P_Ps_isATSBrakeDisable"),      //ブレーキ開放
            isAlertButton1Pressed: dm.getBoolean("ATS-P_Ps_acknowledgeAlert"),//ATS確認ボタン押下
            isAlertButton2Pressed: dm.getBoolean("ATS-P_Ps_pushAlertButton"), //ATS警報持続ボタン押下
            isATSBrake: dm.getBoolean("ATS-P_Ps_isATSBrake"),                 //ATS非常ブレーキ:直下地上子(ATS-Ps/Sx)
            isATSLongBrake: dm.getBoolean("ATS-P_Ps_isATSLongBrake"),         //ATS非常ブレーキ:Sn未確認(ATS-Ps/Sx)
            isRollbackBrake: dm.getBoolean("ATS-P_Ps_isRollbackBrake"),       //ATS非常ブレーキ:後退検知(ATS-Ps)
            isPatternBrakePs: dm.getBoolean("ATS-P_Ps_isPatternBrake_Ps"),    //ATS非常ブレーキ:パターン抵触(ATS-Ps)
            hasPatternPs: dm.getBoolean("ATS-P_Ps_hasPattern_Ps"),            //パターン発生(ATS-Ps)
            isPatternApproachingPs: dm.getBoolean("ATS-P_Ps_patternAlert_Ps"),//パターン接近(ATS-Ps)
            patternSpeedPs: dm.getDouble("ATS-P_Ps_patternSpeed_Ps"),         //パターン速度(ATS-Ps)
            isActiveATSP: dm.getBoolean("ATS-P_Ps_isActiveATSP"),             //ATS-P有効化
            isATSPBrake: dm.getBoolean("ATS-P_Ps_isATSPBrake"),               //ATS-P非常ブレーキ(直下地上子)
            isPatternBrake: dm.getBoolean("ATS-P_Ps_isPatternBrake"),         //ATS-P常用ブレーキ:パターン抵触(ATS-P)
            isPatternBrakeFull: dm.getBoolean("ATS-P_Ps_isPatternBrakeFull"), //ATS-P常用ブレーキ:パターン抵触(ATS-P)
            atspMode: dm.getString("ATS-P_Ps_ATSPMode"),                      //ATS-Pモード(東:"East", 西:"West")
            isPatternApproaching: dm.getBoolean("ATS-P_Ps_patternAlert"),     //パターン接近(ATS-P)
            patternSpeed: dm.getDouble("ATS-P_Ps_patternSpeed")               //パターン速度(ATS-P)
        }
    },
    renderInstalledObjects: function (entity, pass, x, y, z, yaw) {
        var GLHelper = Packages.jp.ngt.ngtlib.renderer.GLHelper;
        if (!entity || pass !== 0) return;

        var state = this.getState(entity);
        if (!state) return;
        var speed = Math.abs(entity.getSpeed() * 72);
        var dataMap = entity.getResourceState().getDataMap();
        var atsType = dataMap.getString("ATSType");

        //非発光パーツ
        this.parts.body.render(renderer);
        for (var i = 0; i < 80; i++) {
            GL11.glPushMatrix();
            GL11.glTranslatef(x, y, z);
            GL11.glRotatef(yaw, 0, 1, 0);
            GL11.glTranslatef(-0.001759 * i, 0, 0);
            GL11.glRotatef(-yaw, 0, 1, 0);
            GL11.glTranslatef(-x, -y, -z);
            this.parts.meter0.render(renderer);
            GL11.glPopMatrix();
        }

        //発光パネル
        GLHelper.disableLighting();
        GLHelper.setLightmapMaxBrightness();
        if (atsType === "ATS-P_East" || atsType === "ATS-P_West" || atsType === "ATS-P_Ps") {
            if (state.isATSBrake) this.parts.directBrake.render(renderer);
            else if (state.isATSLongBrake) this.parts.rollbackBrake.render(renderer);
            else if (state.isPatternBrake || state.isPatternBrakeFull || state.isPatternBrakePs) this.parts.patternOver.render(renderer);
            else if (state.isATSLongBrake) this.parts.longBrake.render(renderer);
            else this.parts.normal.render(renderer);
            this.parts.powerP.render(renderer);
            if (state.isPatternApproaching || state.isPatternApproachingPs) this.parts.pattern.render(renderer);
            var isATSBrake = state.isATSBrake || state.isATSLongBrake || state.isPatternBrake || state.isPatternBrakeFull || state.isATSLongBrake || state.isPatternBrakePs;
            if (isATSBrake) this.parts.brake.render(renderer);
            if (state.isBrakeDisable) this.parts.disable.render(renderer);
            if (state.isActiveATSP) this.parts.patternP.render(renderer);
            if (state.hasPatternPs) this.parts.patternPs.render(renderer);
            if (state.isInitialize || (state.isAtsFault && state.isActiveATSP)) this.parts.failureP.render(renderer);
            if (state.isInitialize || (state.isAtsFault && !state.isActiveATSP)) this.parts.failurePs.render(renderer);
            var patternSpeed = Math.min(state.patternSpeedPs, state.patternSpeed);
            for (var i = 0; i < 80; i++) {
                var partSpd = i * (140 / 79);
                GL11.glPushMatrix();
                GL11.glTranslatef(x, y, z);
                GL11.glRotatef(yaw, 0, 1, 0);
                GL11.glTranslatef(-0.001759 * i, 0, 0);
                GL11.glRotatef(-yaw, 0, 1, 0);
                GL11.glTranslatef(-x, -y, -z);
                if (partSpd < speed) this.parts.meter1.render(renderer);
                //else if (patternSpeed > 0 && partSpd >= patternSpeed) this.parts.meter2.render(renderer);
                else if (patternSpeed !== 0 && partSpd >= patternSpeed) this.parts.meter2.render(renderer);
                GL11.glPopMatrix();
            }
        }
        GLHelper.enableLighting();
    },
    _setBooleanSync: function (dataMap, key, val) {
        var data = dataMap.getBoolean(key);
        if (val !== data) dataMap.setBoolean(key, val, 1);
    }
}