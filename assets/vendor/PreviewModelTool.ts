/* eslint-disable */
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { message } from "ant-design-vue";

export class PreviewModelTool {
  domEle: any;
  viewWidth: any;
  scene: any;
  camera: any;
  renderer: any;
  model: any;
  boundingBox: any;
  boundingBoxHelper: any;
  animationActions: any;
  directionalLight: any;
  viewHeight: any;
  orbitControl: any;
  animationFrame: any;
  options: any;
  lastTimestamp: number;
  mixer: any;
  fps: number;
  axesHelper: any;
  isAnimating: boolean;
  initCameraMsg: any;

  constructor(options?: any) {
    this.domEle = null;
    // 当前浏览器窗口大小
    this.viewWidth = null;
    this.viewHeight = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.boundingBox = null;
    this.boundingBoxHelper = null;
    this.animationActions = {}; // 模型动画名称
    this.directionalLight = null;
    this.orbitControl = null;
    this.animationFrame = null;
    this.options = options;
    this.lastTimestamp = performance.now(); // 初始化FPS计算
    this.mixer = null;
    this.fps = 0;
    this.axesHelper = 0;
    this.isAnimating = false;
  }

  init(domEle: HTMLElement) {
    this.domEle = domEle;
    this.viewWidth = this.domEle.offsetWidth;
    this.viewHeight = this.domEle.offsetHeight;
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options?.bgColor || 0xf7f8fa);
    // 创建透视摄像机   形参：视野角度(FOV), 长宽比(aspect ratio), 近截面(near), 远截面(far)
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.viewWidth / this.viewHeight,
      0.1,
      100 * 10000
    );

    // webGL渲染器，它利用电脑的显卡来渲染画面
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // 设置渲染器渲染尺寸
    this.renderer.setSize(this.viewWidth, this.viewHeight);
    // 开启渲染阴影
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 在body中创建webgl容器
    this.domEle.appendChild(this.renderer.domElement);

    // 模拟 HDRI 环境效果
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 10;

    // 柔和的白色全局灯光
    this.scene.add(new THREE.AmbientLight(0x404040));

    this.createDirectionalLight(
      this.options?.lightColor,
      this.options?.lightIntensity
    );

    this.scene.add(this.directionalLight);

    this.orbitControl = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );

    this.start();
  }

  /**
   * 加载obj模型
   */
  loadObjModel(url: string) {
    this.destroyModel();
    return new Promise((resolve, reject) => {
      new OBJLoader().load(
        url,
        (obj) => {
          this.commonConfig(obj);
          resolve(obj);
        },
        () => { },
        (err) => {
          message.error("预览失败，请检查资源地址！");
          reject(err);
        }
      );
    });
  }

  /**
   * 加载fbx模型
   * @param url
   */
  loadFbxModel(url: string) {
    this.destroyModel();
    return new Promise((resolve, reject) => {
      new FBXLoader().load(
        `${url}`,
        (fbx) => {
          this.commonConfig(fbx);
          resolve(fbx);
        },
        () => { },
        (err) => {
          message.error("预览失败，请检查资源地址！");
          reject(err);
        }
      );
    });
  }

  /**
   * gltf模型预览
   * @param url
   */
  loadGltfModel(url: string) {
    this.destroyModel();
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf: any) => {
          this.commonConfig(gltf.scene);
          resolve(gltf);
        },
        () => { },
        (err) => {
          message.error("预览失败，请检查资源地址！");
          reject(err);
        }
      );
    });
  }

  /**
   * 通用加载模型设置
   * @param model
   */
  commonConfig(model: THREE.Object3D) {
    this.setBoundingBox(model);
    this.setCoordinateAxis();
    this.handleModelView();
    this.animationActions = this.getModelAnimations(model);
    this.model = model;
    this.scene.add(model);
    this.initCameraMsg = {
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone()
    }
  }

  /**
   * 添加阴影
   * @param bool
   */
  setShadow = (bool: boolean) => {
    this.model.traverse((node: any) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = bool;
        node.receiveShadow = bool;
      }
    });
    this.directionalLight.castShadow = bool;
    this.directionalLight.shadow.camera.near = 0.5;
    const num = 10000;
    this.directionalLight.shadow.camera.far = this.boundingBox.max.z + num;
    this.directionalLight.shadow.camera.left = this.boundingBox.min.x - num;
    this.directionalLight.shadow.camera.right = this.boundingBox.max.x + num;
    this.directionalLight.shadow.camera.top = this.boundingBox.max.y + num;
    this.directionalLight.shadow.camera.bottom = this.boundingBox.min.y - num;
  };

  /**
   * 创建平行光
   * @param color
   * @param intensity
   */
  createDirectionalLight(color = 0xffffff, intensity = 0.5) {
    this.directionalLight = new THREE.DirectionalLight(color, intensity);
    this.directionalLight.shadow.mapSize = new THREE.Vector2(
      1024 * 10,
      1024 * 10
    );
    this.scene.add(this.directionalLight);
  }

  /**
   * 获取模型动画
   * @param model
   */
  getModelAnimations(model: THREE.Object3D) {
    let animationActions: { [propsName: string]: string } = {};
    if (model.animations && model.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(model);
      model.animations.forEach((animation: any) => {
        const action: any = this.mixer.clipAction(animation);
        action.setLoop(THREE.LoopOnce);
        animationActions[animation.name] = action;
      });
    }
    return animationActions;
  }

  /**
   * @description 播放动画
   * @param animationName 动画名
   */
  playAnimation = (animationName: string) => {
    // 停止其他正在播放的动画
    if (this.animationActions) {
      Object.values(this.animationActions).forEach((action: any) =>
        action.stop()
      );
    }
    // 播放选定的动画
    const selectedAction = this.animationActions[animationName];
    if (selectedAction) {
      selectedAction.play();
      return new Promise((resolve) => {
        // 监听动画播放完毕
        this.mixer.addEventListener("finished", () => {
          resolve(true);
        });
      });
    } else {
      return false;
    }
  };

  /**
   * 设置模型包围盒
   * @param model
   */
  setBoundingBox(model: THREE.Object3D) {
    // 获取模型的边界框
    const bbox = new THREE.Box3().setFromObject(model);
    // this.boundingBox.applyMatrix4(model.matrixWorld); // 将bounding box转换为世界坐标系
    const center = bbox.getCenter(new THREE.Vector3());
    model.position.sub(center);
    this.boundingBox = new THREE.Box3().setFromObject(model);
    this.boundingBox.expandByObject(model);
    // 创建包围盒的边框网格
    this.boundingBoxHelper = new THREE.Box3Helper(
      this.boundingBox,
      new THREE.Color(0xf6782c)
    );
    this.boundingBoxHelper.position.sub(center);
    this.scene.add(this.boundingBoxHelper);
    this.boundingBoxHelper.visible = false;
  }

  /**
   * 显隐模型布线
   * @param bool
   */
  setWireframe = (bool: boolean) => {
    this.model.traverse((node: any) => {
      if (node instanceof THREE.Mesh) {
        if (Array.isArray(node.material)) {
          node.material.forEach((item) => {
            item.wireframe = bool;
          });
        } else {
          node.material.wireframe = bool;
        }
      }
    });
  };

  /**
   * @description 添加坐标轴
   */
  setCoordinateAxis = () => {
    const size = this.boundingBox.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    this.axesHelper = new THREE.AxesHelper(maxDimension);
    this.scene.add(this.axesHelper);
    this.axesHelper.visible = false;
  };

  flyTo() {
    this.camera.position.set(...this.initCameraMsg.position);
    this.camera.rotation.set(...this.initCameraMsg.rotation);
  }
  /**
   * @Description: 改变scene背景色
   * @return {*}
   */
  changeBackground(color: string) {
    if (this.scene.background) {
      this.scene.background.set(color);
    }
  }
  /**
   * 调整摄像机裁切视角并调整到最佳可视距离
   */
  handleModelView() {
    // 获取边界框的尺寸
    const size = this.boundingBox.getSize(new THREE.Vector3());
    // 获取中心位置
    const center = this.boundingBox.getCenter(new THREE.Vector3());
    // 调整摄像机的可视距离
    const cameraDistance = this.boundingBox
      .getSize(new THREE.Vector3())
      .length(); // 调整距离
    // 计算裁剪距离
    const maxDimension = Math.max(size.x, size.y, size.z);
    // 调整摄像机的裁剪距离
    // this.camera.near = maxDimension / 100;
    this.camera.far = maxDimension * 100;
    const z = center.y + cameraDistance;
    this.camera.position.set(
      center.x + z,
      Math.tan((Math.PI * 45) / 360) * z,
      z
    );
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  destroyModel = () => {
    if (this.model) {
      // 从场景中移除模型
      this.scene.remove(this.model);
      // 释放模型的几何体和材质资源
      this.model.traverse((node: any) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          if (Array.isArray(node.material)) {
            node.material.forEach((material: any) => {
              material.dispose();
            });
          } else {
            node.material.dispose();
          }
        }
      });
      // 释放模型本身的资源
      this.model = null;
    }
  };

  /**
   * @description 暂停动画
   */
  pause() {
    this.isAnimating = false;
    // 取消之前的 requestAnimationFrame 请求
    cancelAnimationFrame(this.animationFrame);
  }

  /**
   * @description 启动动画
   */
  start() {
    this.isAnimating = true;
    // 重置为当前时间戳
    this.lastTimestamp = performance.now();
    this.animate();
  }

  /**
   * 截图功能
   * @param width
   * @param height
   * @param extension
   * @param quality
   */
  screenshot(
    width?: number,
    height?: number,
    extension = "png",
    quality = 0.5
  ) {
    if (width && height) {
      this.changeSize(width, height);
    } else {
      this.changeSize(this.viewWidth, this.viewHeight);
    }
    this.renderer.render(this.scene, this.camera);
    const img = this.renderer.domElement.toDataURL(extension, quality);
    // 还原尺寸
    this.changeSize(this.viewWidth, this.viewHeight);
    this.renderer.render(this.scene, this.camera);
    return img;
  }

  changeSize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate = () => {
    this.animationFrame = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
    this.directionalLight.position.x = this.camera.position.x;
    this.directionalLight.position.y = this.camera.position.y;
    this.directionalLight.position.z = this.camera.position.z;

    if (this.mixer) {
      this.mixer.update(0.01);
    }

    // 计算FPS
    const currentTimestamp = performance.now();
    const elapsedMilliseconds = currentTimestamp - this.lastTimestamp;
    this.fps = Number((1000 / elapsedMilliseconds).toFixed(0));
    // 更新上一帧的时间戳
    this.lastTimestamp = currentTimestamp;
  };
}
