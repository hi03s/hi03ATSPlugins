var renderClass = "jp.ngt.rtm.render.SignalPartsRenderer";
importPackage(Packages.org.lwjgl.opengl);
importPackage(Packages.jp.ngt.rtm.render);

importPackage(Packages.jp.ngt.rtm);//RTMItem
importPackage(Packages.jp.ngt.ngtlib.util);//NGTUtilClient
importPackage(Packages.net.minecraft.item);//Item

function init(par1, par2) {
    body = renderer.registerParts(new Parts("body"));
    forward = renderer.registerParts(new Parts("forward"));
    items = [
        RTMItem.installedObject, RTMItem.crowbar
    ];
}

function render(entity, pass, par3) {
    body.render(renderer);
    var itemStack = NGTUtilClient.getMinecraft().field_71439_g.field_71071_by.func_70448_g();
    if (itemStack !== null && items.indexOf(itemStack.func_77973_b()) !== -1) {
        forward.render(renderer);
    }
}
