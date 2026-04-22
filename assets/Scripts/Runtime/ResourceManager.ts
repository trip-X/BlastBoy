import { Asset, BitmapFont, Prefab, resources, SpriteFrame } from "cc";
import Singleton from "../Base/Singleton";

export default class ResourceManager extends Singleton{

    // 静态getter语法糖：简化单例实例的获取
    static get Instance(){
        return super.GetInstance<ResourceManager>()
    }

    // 加载瓷砖精灵帧资源,直接写type:SpriteFrame则报错，因为SpriteFrame表示一个实例，因此要用typeof SpriteFrame
    loadDir(path:string, type: typeof SpriteFrame = SpriteFrame){
        // await只等待Promise对象, resolve用来返回数据, reject用来返回错误
        return new Promise<SpriteFrame[]>((resolve,reject)=>{
            // resources.loadDir 是Cocos提供的资源加载函数
            // 参数1：资源目录（相对于resources文件夹）
            // 参数2：资源类型
            // 参数3：加载完成回调函数（err：错误信息，assets：加载到的资源数组）
            resources.loadDir(path, type, function(err, assets){
                // 如果加载失败，执行reject传递错误信息
                if(err){
                    reject(err)
                    return
                }
                // 加载成功，执行resolve返回帧数组
                resolve(assets)
            })
        })
    }

    loadPrefab(path: string) {
    return new Promise<Prefab>((resolve, reject) => {
        resources.load(path, Prefab, (err, asset) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(asset);
        });
    });
}

    loadAsset<T extends Asset>(path: string, type: typeof Asset) {
    return new Promise<T>((resolve, reject) => {
        resources.load(path, type, (err, asset) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(asset as T);
        });
    });
}

    loadBitmapFont(path: string) {
        return this.loadAsset<BitmapFont>(path, BitmapFont as any)
    }
}

