//NGTLib
importPackage(Packages.jp.ngt.ngtlib.math);//Vec3
importPackage(Packages.jp.ngt.ngtlib.io);//NGTLog
importPackage(Packages.jp.ngt.ngtlib.util);//NGTUtil
importPackage(Packages.jp.ngt.ngtlib.block);//BlockUtil

//RealTrainMod
importPackage(Packages.jp.ngt.rtm);//RTMCore
importPackage(Packages.jp.ngt.rtm.electric);//TileEntitySignal
importPackage(Packages.jp.ngt.rtm.rail);//TileEntityLargeRailBase
importPackage(Packages.jp.ngt.rtm.entity.train);//EntityTrainBase EntityBogie

//Minecraft
importPackage(Packages.net.minecraft.tileentity);//TileEntityCommandBlock
importPackage(Packages.net.minecraft.command.server);//CommandBlockLogic
importPackage(Packages.net.minecraft.util);//AxisAlignedBB(1.7.10)
importPackage(Packages.net.minecraft.util.math);//AxisAlignedBB(1.12)

var isOldVer = RTMCore.VERSION.indexOf("1.7.10") !== -1;
var SettingsCache = new java.util.HashMap();
var SettingsCMDBlockCache = new java.util.HashMap();
var LastCollideTrain = new java.util.HashMap();
var Blocks = {
    StainedGlass: Packages.net.minecraft.init.Blocks.field_150399_cn,
    RedstoneBlock: Packages.net.minecraft.init.Blocks.field_150451_bX,
    Wool: Packages.net.minecraft.init.Blocks.field_150325_L
}

/*
・直下地上子、ロング地上子、パターン地上子、誤出発防止地上子
{
    "signal": [[x, y, z],...]   必須 / 連動する信号機 (nullを渡した場合は終端/赤現示固定)
}

・速度制限地上子
{
    "speed": speed              必須 / 制限速度[km/h] 必要に応じて+10～20km/hに設定すること
}

・分岐制限地上子
{
    "speed": speed,             必須 / 制限速度[km/h] 必要に応じて+10～20km/hに設定すること
    "branchPos": [x, y, z],     必須 / 分岐を制御するRSブロックの座標
    "dir": true                 必須 / 制限を有効とするときの分岐器の向き true:RSがONのとき、false:RSがOFFのとき
}

・誤出発防止ﾀｲﾏｰ起動地上子
{
    "time": time                任意 / ホーム入口から一番遠い停車位置までの停車に必要な時間[秒] デフォルトで90秒
}

*/

var Options = {//コマブロに必須とする情報のリスト
    "signal": [
        "hi03ATS_Sx_Directory", "hi03ATS_Sx_Long", "hi03ATS_Sx_Prevention"
    ],
    "speed": ["hi03ATS_Sx_SpeedLimit", "hi03ATS_Sx_SpeedLimitBranch"],
    "branchPos": ["hi03ATS_Sx_SpeedLimitBranch"],
    "dir": ["hi03ATS_Sx_SpeedLimitBranch"],
    "time": ["hi03ATS_Sx_PreventionTimer"]
}

function onUpdate(entity, scriptExecuter) {
    var x = entity.field_70165_t;
    var y = entity.field_70163_u;
    var z = entity.field_70161_v;
    var world = entity.field_70170_p;
    var settingsCMDBlock = getCommand(world, x, y - 1, z);
    var modelName = entity.getResourceState().getResourceName();

    //設定
    if (!settingsCMDBlock) return;
    var settings = SettingsCache.get(entity) || {};
    var cmdCache = SettingsCMDBlockCache.get(entity);
    if (cmdCache !== settingsCMDBlock) {
        SettingsCMDBlockCache.put(entity, settingsCMDBlock);
        settings = {};
        try {
            settings = JSON.parse(settingsCMDBlock);
            SettingsCache.put(entity, settings);
        }
        catch (e) {
            settings = null;
            NGTLog.sendChatMessageToAll("[ATS-Sx] ERROR -> " + e);
        }
    }
    if (!settings) return;

    //RSブロック検知
    if (getBlock(world, x, y - 2, z) === Blocks.RedstoneBlock) return;

    //車両の検知 指向性あり
    var collideTrain = getCollideTrain(entity, world, x, y, z);
    if (collideTrain) {
        var lastTrainEntity = LastCollideTrain.get(entity);
        if (lastTrainEntity !== collideTrain) {//検知
            LastCollideTrain.put(entity, collideTrain);
            if (!collideTrain.isControlCar()) return;
            var trainDataMap = collideTrain.getResourceState().getDataMap();
            //情報取得
            var signalLevel = null;
            var limitSpeed = null;
            var branchPos = null;
            var branchDir = null;
            var time = null;
            if (Options.signal.indexOf(modelName) !== -1) {
                if (settings.signal === undefined) {
                    NGTLog.sendChatMessageToAll("[c] Can't find signal: " + settings.signal.join(","));
                    return;
                }
                else if (settings.signal === null) signalLevel = 1;
                else {
                    for (var i = 0; i < settings.signal.length; i++) {
                        var signalPos = settings.signal[i];
                        var level = getSignalLevel(world, signalPos[0], signalPos[1], signalPos[2]);
                        if (level === null) {
                            NGTLog.sendChatMessageToAll("[ATS-Sx] Can't find signal: " + settings.signal.join(","));
                            return;
                        }
                        signalLevel = Math.max(signalLevel, level);
                    }
                }
            }
            if (Options.speed.indexOf(modelName) !== -1) limitSpeed = settings.speed;
            if (Options.branchPos.indexOf(modelName) !== -1) branchPos = settings.branchPos;
            if (Options.dir.indexOf(modelName) !== -1) branchDir = settings.dir;
            if (Options.time.indexOf(modelName) !== -1) time = settings.time ? settings.time : 90;

            //送信情報
            var trainSpeed = collideTrain.getSpeed() * 72;//[km/h]
            var sendData = getSendData(world, modelName, signalLevel, time, limitSpeed, trainSpeed, branchPos, branchDir);
            //送信
            var sendDataJson = JSON.stringify(sendData).replace(/,/g, "☆");
            trainDataMap.setString("ATSDataReceive", sendDataJson, 1);
            //NGTLog.sendChatMessageToAll("[ATS-Sx debug] SendData:" + sendDataJson.replace(/☆/g, ","));

            //ATSプラグイン未搭載車への対応(ATS-Sx機能)
            if (trainDataMap.getString("ATSType") === "" && signalLevel === 1) {
                var core = null;
                var rail = getTileEntity(world, x, y, z);
                if (!(rail instanceof TileEntityLargeRailBase)) rail = getTileEntity(world, x, y - 1, z);
                if (rail instanceof TileEntityLargeRailBase) core = rail.getRailCore();

                //ロング地上子
                if (modelName === "hi03ATS_Sx_Long") {
                    if (core) core.setSignal(1);
                }

                //直下地上子
                if (modelName === "hi03ATS_Sx_Directory") {
                    if (core) core.setSignal(1);
                    collideTrain.setNotch(-8);
                    collideTrain.setSignal(1);
                }
            }
        }
    }
    else {
        if (modelName === "hi03ATS_Sx_Long" || modelName === "hi03ATS_Sx_Directory") {
            var rail = getTileEntity(world, x, y, z);
            if (!(rail instanceof TileEntityLargeRailBase)) rail = getTileEntity(world, x, y - 1, z);
            if (rail instanceof TileEntityLargeRailBase) {
                //ATS-Sx用信号戻し
                var core = rail.getRailCore();
                if (core && core.getSignal() === 1) core.setSignal(0);

                //列車検知リセット
                if (!rail.isTrainOnRail()) {
                    LastCollideTrain.put(entity, null);
                }
            }
        }
    }
}

function getSignalLevel(world, x, y, z) {
    var tile = getTileEntity(world, x, y, z);
    if (tile instanceof TileEntitySignal) {
        return NGTUtil.getField(
            TileEntitySignal.class,
            tile,
            ["signalLevel"]
        );
    }
    return null;
}

function getCommand(world, x, y, z) {
    var block = getTileEntity(world, x, y, z);
    if (!(block instanceof TileEntityCommandBlock)) return null;
    return NGTUtil.getField(
        CommandBlockLogic.class,
        block.func_145993_a(),
        ["Command", "field_145763_e"]
    );
}

function getTileEntity(world, x, y, z) {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (isOldVer) return world.func_147438_o(x, y, z);
    else return BlockUtil.getTileEntity(world, x, y, z);
}

function getCollideTrain(entity, world, x, y, z) {
    var aabb = getAABBFromSize(x, y, z, 1);
    var target = null;
    var bogie = null;
    world.func_72839_b(entity, aabb).forEach(
        function (detectEntity) {
            if (detectEntity instanceof EntityTrainBase) target = detectEntity;
            else if (detectEntity instanceof EntityBogie) {
                var train = detectEntity.getTrain();
                if (train) {
                    target = train;
                    bogie = detectEntity;
                }
            }
        }
    );
    if (!target) return null;//何も検知してない
    if (checkTrainMotion(entity, target)) {
        if (bogie) {
            var frontBogie = target.getBogie(target.getTrainDirection());
            if (bogie === frontBogie) return target;
            else {//先頭じゃない台車
                LastCollideTrain.put(entity, null);
                return null;
            }
        }
        else {//台車じゃない
            LastCollideTrain.put(entity, null);
            return null;
        }
    }
    else {//逆走検知
        LastCollideTrain.put(entity, null);
        return null;
    };
}

function getAABBFromSize(x, y, z, size) {
    var h = size / 2;
    return getAABB(x - h, y - h, z - h, x + h, y + h, z + h);
}

function getAABB(x1, y1, z1, x2, y2, z2) {
    if (isOldVer) return AxisAlignedBB.func_72330_a(x1, y1, z1, x2, y2, z2);
    else return new AxisAlignedBB(x1, y1, z1, x2, y2, z2);
}

function checkTrainMotion(entity, collideTrain) {
    if (!entity || !collideTrain) return false;
    var motionVec = new Vec3(
        collideTrain.field_70165_t - collideTrain.field_70169_q,// posX - prevPosX
        collideTrain.field_70163_u - collideTrain.field_70167_r,// posY - prevPosY
        collideTrain.field_70161_v - collideTrain.field_70166_s // posZ - prevPosZ
    );
    if (motionVec.length() === 0) {
        var formation = collideTrain.getFormation();
        var entry = formation ? formation.getEntry(collideTrain) : null;
        var isDirInvert = entry ? Boolean(entry.dir) : false;
        var speed = isDirInvert ? -collideTrain.getSpeed() : collideTrain.getSpeed();
        var trainYaw = collideTrain.field_70177_z + 180;
        motionVec = new Vec3(0, 0, speed);
        motionVec = motionVec.rotateAroundY(trainYaw);
    }
    if (motionVec.length() === 0) motionVec = null;
    var entityYaw = entity.field_70177_z + 180;
    var motionYaw = motionVec !== null ? motionVec.getYaw() : null;
    var yawDiff = motionYaw !== null ? Math.abs(fixedYawDiff(entityYaw, motionYaw)) : null;
    return (yawDiff !== null && yawDiff < 45);
}

function fixedYawDiff(yaw1, yaw2) {
    var d1 = ((yaw1 - yaw2) - 360) % 360;
    var d2 = ((yaw1 - yaw2) + 360) % 360;
    return Math.abs(d1) < Math.abs(d2) ? d1 : d2;
}

function getSendData(world, modelName, signalLevel, time, speedLimit, trainSpeed, branchPos, branchDir) {
    var sendData = {};

    //直下地上子
    if (modelName === "hi03ATS_Sx_Directory") {
        if (signalLevel === 1) sendData.stop1 = true;//即時停止
    }

    //ロング地上子
    else if (modelName === "hi03ATS_Sx_Long") {
        if (signalLevel === 1) sendData.alert = true;//警報
        //自動運転用の付加情報(信号機までの距離や信号レベル)を送信する
        sendData.info = {
            "signalLevel": signalLevel,
            "distance": 600 - 20 //600m - 方外20m
        }
    }

    //誤出発防止地上子
    else if (modelName === "hi03ATS_Sx_Prevention") {
        if (signalLevel === 1) sendData.stop2 = true;//即時停止(無効機能付き)
    }

    //誤出発防止ﾀｲﾏｰ起動地上子
    else if (modelName === "hi03ATS_Sx_PreventionTimer") {
        sendData.time = Math.floor(time * 20);
    }

    //速度制限地上子
    else if (modelName === "hi03ATS_Sx_SpeedLimit") {
        if (trainSpeed > speedLimit) sendData.stop1 = true;//即時停止
    }

    //分岐制限地上子
    else if (modelName === "hi03ATS_Sx_SpeedLimitBranch") {
        if (!branchPos) {
            NGTLog.sendChatMessageToAll('[ATS-Sx] Not find "branchPos"');
        }
        else {
            var block = getBlock(world, branchPos[0], branchPos[1], branchPos[2]);
            if ((branchDir && block === Blocks.RedstoneBlock) || (!branchDir && block !== Blocks.RedstoneBlock)) {
                if (trainSpeed > speedLimit) sendData.stop1 = true;//即時停止
            }
        }
    }

    sendData.atsType = "ATS-Sx";
    return sendData;
}

function getBlock(world, x, y, z) {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (isOldVer) return world.func_147439_a(x, y, z);
    else return BlockUtil.getBlock(world, x, y, z);
}