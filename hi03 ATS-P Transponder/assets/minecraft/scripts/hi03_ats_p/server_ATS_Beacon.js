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
・直下地上子、パターン地上子、パターン取消地上子
{
    "id": id,                   必須 / パターンID 同じ信号機を指定する[直下地上子/パターン地上子/パターン取消地上子]で同じIDを設定してください(前後の閉塞の地上子とIDが被らなければ同じIDを使用しても大丈夫です)
    "signal": [[x, y, z],...],  必須 / 連動する信号機 (nullを渡した場合は終端/赤現示固定)
    "distance": distance,       任意 / 停止点までの距離[m]
    "branchPos": [x, y, z],     任意 / 分岐を制御するRSブロックの座標(分岐器がある場合)
    "dir": true                 任意 / 機能を有効とするときの分岐器の向き true:RSがONのとき、false:RSがOFFのとき
}

・誘導パターン地上子、入換パターン地上子
{
    "signal": [[x, y, z],...]   必須 / 連動する信号機 (nullを渡した場合は終端/赤現示固定)
}

・分岐制限地上子
{
    "id": id,                   必須 / 分岐器ID(制限区間が被らなければ同名のIDを使用しても大丈夫です)
    "speed": speed,             必須 / 制限速度[km/h] 分岐制限速度+10km/hに設定すること
    "branchPos": [x, y, z],     必須 / 分岐を制御するRSブロックの座標
    "dir": true                 必須 / 制限を有効とするときの分岐器の向き true:RSがONのとき、false:RSがOFFのとき
    "signal": [[x, y, z],...],  任意 / 場内信号機が停止現示のときはパターンが発生しなくなる(より現実的な動作になる)
    "distance": distance        任意 / 制限区間までの距離を指定する[m]
}

・速度制限地上子
{
    "id": id,                   必須 / 速度制限区間ID(制限区間が被らなければ同名のIDを使用しても大丈夫です)
    "speed": speed              必須 / 制限速度[km/h] 標識+10km/hに設定すること
    "length": length,           任意 / 制限区間の長さを指定する[m] (指定した場合、速度制限解除地上子は不要)
    "distance": distance        任意 / 制限区間までの距離を指定する[m]
}

・速度制限解除地上子
{
    "id": id                    必須 / 速度制限区間ID(制限区間が被らなければ同名のIDを使用しても大丈夫です)
}

・ATS-P終了地上子、ATS-P切替地上子(西→東)、ATS-P切替地上子(東→西)
何も記入してないコマンドブロックを設置してください

*/

var Options = {//コマブロに必須とする情報のリスト
    "id": [
        "hi03ATS_P_Directory", "hi03ATS_PN_Directory", "hi03ATS_P_PatternBreak", "hi03ATS_PN_PatternBreak",
        "hi03ATS_P_SpeedLimitBranch", "hi03ATS_P_SpeedLimitEnter", "hi03ATS_P_SpeedLimitExit",
        "hi03ATS_P_Pattern600", "hi03ATS_P_Pattern280", "hi03ATS_P_Pattern180", "hi03ATS_P_Pattern130", "hi03ATS_P_Pattern085", "hi03ATS_P_Pattern050",
        "hi03ATS_PN_Pattern600", "hi03ATS_PN_Pattern280", "hi03ATS_PN_Pattern180", "hi03ATS_PN_Pattern130", "hi03ATS_PN_Pattern085", "hi03ATS_PN_Pattern050"
    ],
    "signal": [
        "hi03ATS_P_Directory", "hi03ATS_PN_Directory", "hi03ATS_P_PatternBreak", "hi03ATS_PN_PatternBreak",
        "hi03ATS_P_Pattern600", "hi03ATS_P_Pattern280", "hi03ATS_P_Pattern180", "hi03ATS_P_Pattern130", "hi03ATS_P_Pattern085", "hi03ATS_P_Pattern050",
        "hi03ATS_PN_Pattern600", "hi03ATS_PN_Pattern280", "hi03ATS_PN_Pattern180", "hi03ATS_PN_Pattern130", "hi03ATS_PN_Pattern085", "hi03ATS_PN_Pattern050",
        "hi03ATS_P_PatternShunting", "hi03ATS_P_PatternCallOn", "hi03ATS_PN_PatternCallOn"
    ],
    "speed": ["hi03ATS_P_SpeedLimitBranch", "hi03ATS_P_SpeedLimitEnter"],
    "branchPos": ["hi03ATS_P_SpeedLimitBranch"],
    "dir": ["hi03ATS_P_SpeedLimitBranch"],
    "none": ["hi03ATS_P_Switch_End", "hi03ATS_P_Switch_WtoE", "hi03ATS_P_Switch_EtoW"]
}

function onUpdate(entity, scriptExecuter) {
    var x = entity.field_70165_t;
    var y = entity.field_70163_u;
    var z = entity.field_70161_v;
    var world = entity.field_70170_p;
    var settingsCMDBlock = getCommand(world, x, y - 1, z);
    var modelName = entity.getResourceState().getResourceName();
    if (Options.none.indexOf(modelName) !== -1) settingsCMDBlock = "{}";

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
            NGTLog.sendChatMessageToAll("[ATS-P] ERROR -> " + e);
        }
    }
    if (!settings) return;

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
            var distance = null;
            var length = null;
            var id = null;
            if (Options.signal.indexOf(modelName) !== -1) {
                if (settings.signal === undefined) {
                    NGTLog.sendChatMessageToAll("[ATS-P] Can't find signal: " + settings.signal.join(","));
                    return;
                }
                else if (settings.signal === null) signalLevel = 1;
                else {
                    for (var i = 0; i < settings.signal.length; i++) {
                        var signalPos = settings.signal[i];
                        var level = getSignalLevel(world, signalPos[0], signalPos[1], signalPos[2]);
                        if (level === null) {
                            NGTLog.sendChatMessageToAll("[ATS-P] Can't find signal: " + settings.signal.join(","));
                            return;
                        }
                        signalLevel = Math.max(signalLevel, level);
                    }
                }
            }
            if (modelName.indexOf("hi03ATS_P_SpeedLimitBranch") !== -1 && settings.signal !== undefined) {
                //分岐制限地上子は信号機を指定しているときは、すべて停止現示のときはパターンを発生させない
                for (var i = 0; i < settings.signal.length; i++) {
                    var signalPos = settings.signal[i];
                    var level = getSignalLevel(world, signalPos[0], signalPos[1], signalPos[2]);
                    if (level === null) {
                        NGTLog.sendChatMessageToAll("[ATS-P] Can't find signal: " + settings.signal.join(","));
                        return;
                    }
                    signalLevel = Math.max(signalLevel, level);
                }
            }
            if (Options.id.indexOf(modelName) !== -1) id = settings.id;
            if (Options.speed.indexOf(modelName) !== -1) limitSpeed = settings.speed;
            if (settings.distance !== undefined) distance = settings.distance;
            if (settings.length !== undefined) length = settings.length;
            if (settings.branchPos !== undefined) branchPos = settings.branchPos;
            if (settings.dir !== undefined) branchDir = settings.dir;

            //送信情報
            var sendData = getSendData(world, modelName, signalLevel, limitSpeed, branchPos, branchDir, distance, id, length);

            //送信
            var sendDataJson = JSON.stringify(sendData).replace(/,/g, "☆");
            trainDataMap.setString("ATSDataReceive", sendDataJson, 1);
            //NGTLog.sendChatMessageToAll("[ATS-P debug] SendData:" + sendDataJson.replace(/☆/g, ","));
        }
    }
    else {
        var rail = getTileEntity(world, x, y, z);
        if (!(rail instanceof TileEntityLargeRailBase)) rail = getTileEntity(world, x, y - 1, z);
        if (rail instanceof TileEntityLargeRailBase) {
            //列車検知リセット
            if (!rail.isTrainOnRail()) {
                LastCollideTrain.put(entity, null);
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

function getSendData(world, modelName, signalLevel, limitSpeed, branchPos, branchDir, distance, id, length) {
    var sendData = {};

    var isIgnore = false;
    if (branchPos) {
        var block = getBlock(world, branchPos[0], branchPos[1], branchPos[2]);
        isIgnore = (branchDir && block !== Blocks.RedstoneBlock) || (!branchDir && block === Blocks.RedstoneBlock);
    }

    //直下地上子
    if (modelName === "hi03ATS_P_Directory" || modelName === "hi03ATS_PN_Directory") {
        if (!isIgnore) {
            if (signalLevel === 1) {
                sendData.stop = true;//即時停止
                sendData.id = "Directory";
                sendData.speed = 15;
                sendData.distance = 0;
                sendData.length = 80;
            }
            sendData.releaseId = id;
            sendData.releaseShunting = true;
        }
    }

    //パターン地上子
    else if (modelName === "hi03ATS_P_Pattern600" || modelName === "hi03ATS_PN_Pattern600") {
        if (!isIgnore) {
            if (signalLevel === 1) {
                sendData.id = id;
                sendData.speed = 15;
                sendData.distance = distance ? distance : 600;
                sendData.length = -1;//-1は無限
            }
            else sendData.releaseId = id;
        }
    }
    else if (modelName === "hi03ATS_P_Pattern280" || modelName === "hi03ATS_PN_Pattern280") {
        if (!isIgnore) {
            if (signalLevel === 1) {
                sendData.id = id;
                sendData.speed = 15;
                sendData.distance = distance ? distance : 280;
                sendData.length = -1;//-1は無限
            }
            else sendData.releaseId = id;
        }
    }
    else if (modelName === "hi03ATS_P_Pattern180" || modelName === "hi03ATS_PN_Pattern180") {
        if (!isIgnore) {
            if (signalLevel === 1) {
                sendData.id = id;
                sendData.speed = 15;
                sendData.distance = distance ? distance : 180;
                sendData.length = -1;//-1は無限
            }
            else sendData.releaseId = id;
        }
    }
    else if (modelName === "hi03ATS_P_Pattern130" || modelName === "hi03ATS_PN_Pattern130") {
        if (!isIgnore) {
            if (signalLevel === 1) {
                sendData.id = id;
                sendData.speed = 15;
                sendData.distance = distance ? distance : 130;
                sendData.length = -1;//-1は無限
            }
            else sendData.releaseId = id;
        }
    }
    else if (modelName === "hi03ATS_P_Pattern085" || modelName === "hi03ATS_PN_Pattern085") {
        if (!isIgnore) {
            if (signalLevel === 1) {
                sendData.id = id;
                sendData.speed = 15;
                sendData.distance = distance ? distance : 85;
                sendData.length = -1;//-1は無限
            }
            else sendData.releaseId = id;
        }
    }
    else if (modelName === "hi03ATS_P_Pattern050" || modelName === "hi03ATS_PN_Pattern050") {
        if (!isIgnore) {
            if (signalLevel === 1) {
                sendData.id = id;
                sendData.speed = 15;
                sendData.distance = distance ? distance : 50;
                sendData.length = -1;//-1は無限
            }
            else sendData.releaseId = id;
        }
    }

    //パターン取消地上子
    else if (modelName === "hi03ATS_P_PatternBreak" || modelName === "hi03ATS_PN_PatternBreak") {
        if (!isIgnore) {
            if (signalLevel === 1) {
                sendData.id = id;
                sendData.speed = 15;
                sendData.distance = -1;//-1は継続
                sendData.length = -1;//-1は無限
            }
            else {
                sendData.releaseId = id;
            }
        }
    }

    //誘導パターン地上子
    else if (modelName === "hi03ATS_P_PatternCallOn" || modelName === "hi03ATS_PN_PatternCallOn") {
        if (signalLevel !== 1) {
            sendData.id = "CallOn";
            sendData.speed = 25;
            sendData.distance = 0;
            sendData.length = -1;//-1は無限
        }
    }

    //入換パターン地上子
    else if (modelName === "hi03ATS_P_PatternShunting") {
        if (signalLevel === 1) {
            sendData.id = "Shunting";
            sendData.speed = 30;
            sendData.distance = 0;
            sendData.length = -1;//-1は無限
        }
    }

    //分岐制限地上子
    else if (modelName === "hi03ATS_P_SpeedLimitBranch") {
        if (!branchPos) {
            NGTLog.sendChatMessageToAll('[ATS-P] Not find "branchPos"');
        }
        else if (signalLevel !== 1) {
            var block = getBlock(world, branchPos[0], branchPos[1], branchPos[2]);
            if ((branchDir && block === Blocks.RedstoneBlock) || (!branchDir && block !== Blocks.RedstoneBlock)) {
                sendData.id = id;
                sendData.speed = limitSpeed;
                sendData.distance = distance ? distance : 600;
                sendData.length = 0;
            }
        }
    }

    //速度制限地上子
    else if (modelName === "hi03ATS_P_SpeedLimitEnter") {
        sendData.id = id;
        sendData.speed = limitSpeed;
        sendData.distance = distance ? distance : 600;
        sendData.length = length ? length : -1;
    }

    //速度制限解除地上子
    else if (modelName === "hi03ATS_P_SpeedLimitExit") {
        sendData.releaseId = id;
    }

    //ATS-P終了地上子
    else if (modelName === "hi03ATS_P_Switch_End") {
        sendData.switch = "End";
    }

    //ATS-P切替地上子(西→東)
    else if (modelName === "hi03ATS_P_Switch_WtoE") {
        sendData.switch = "WtoE";
    }

    //ATS-P切替地上子(東→西)
    else if (modelName === "hi03ATS_P_Switch_EtoW") {
        sendData.switch = "EtoW";
    }

    sendData.atsType = "ATS-P";
    return sendData;
}

function getBlock(world, x, y, z) {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (isOldVer) return world.func_147439_a(x, y, z);
    else return BlockUtil.getBlock(world, x, y, z);
}