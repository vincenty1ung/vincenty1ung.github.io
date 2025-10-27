// 定义要加载的年份文件(按倒序排列)
const yearFiles = ['2025.html', '2023.html'];

// 动态加载年份内容 - 并行加载但按顺序显示
async function loadYearContent() {
  console.log('开始加载年份内容...');
  const container = document.getElementById('portfolio-years');
  
  // 检查容器元素是否存在
  if (!container) {
    console.error('未找到ID为portfolio-years的容器元素');
    return;
  }
  
  console.log('找到容器元素:', container);
  
  // 检查是否在iframe中运行（可能与浏览器扩展冲突有关）
  if (window.self !== window.top) {
    console.warn('代码在iframe中运行，可能存在浏览器扩展冲突');
  }
  
  // 创建一个数组来存储每个年份文件的Promise
  const promises = yearFiles.map(file => {
    console.log(`开始加载文件: ${file}`);
    
    // 使用XMLHttpRequest作为fetch的备选方案
    if (typeof fetch === 'undefined') {
      console.warn('fetch API不可用，使用XMLHttpRequest');
      return loadFileWithXHR(file).then(data => ({file, data})).catch(error => {
        console.error(`加载 ${file} 失败:`, error);
        return {file, data: null, error};
      });
    } else {
      // 使用fetch API
      return loadFileWithFetch(file).then(data => ({file, data})).catch(error => {
        console.error(`加载 ${file} 失败:`, error);
        return {file, data: null, error};
      });
    }
  });
  
  // 等待所有文件加载完成
  const results = await Promise.all(promises);
  
  // 按原始顺序处理结果
  results.forEach(result => {
    if (result.data) {
      handleFileData(result.file, result.data, container, yearFiles.length);
    }
  });
  
  // 所有文件处理完成，绑定Fancybox
  checkAndBindFancybox(yearFiles.length, yearFiles.length);
}

// 使用XMLHttpRequest加载文件的辅助函数
function loadFileWithXHR(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', file, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`HTTP error! status: ${xhr.status}`));
        }
      }
    };
    xhr.onerror = function() {
      reject(new Error(`网络错误`));
    };
    try {
      xhr.send();
    } catch (error) {
      reject(error);
    }
  });
}

// 使用fetch加载文件的辅助函数
function loadFileWithFetch(file) {
  return fetch(file)
    .then(response => {
      console.log(`收到 ${file} 的响应:`, response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    });
}

// 处理文件数据的通用函数
function handleFileData(fileName, data, container, totalFiles) {
  console.log(`成功获取 ${fileName} 的内容，长度: ${data.length} 字符`);
  
  // 创建一个临时元素来解析 HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = data;
  
  console.log(`解析 ${fileName} 的HTML内容，子节点数量:`, tempDiv.children.length);
  
  // 检查是否有可添加的内容
  if (tempDiv.firstChild) {
    // 将解析后的内容添加到主容器
    container.appendChild(tempDiv.firstChild);
    console.log(`成功添加 ${fileName} 的内容到容器`);
  } else {
    console.warn(`${fileName} 没有有效内容可添加`);
  }
  
  // 在内容添加到DOM后，重新绑定图片加载事件和Fancybox事件
  bindImageLoadEvents();
}

// 绑定图片加载事件的函数
function bindImageLoadEvents() {
  console.log('绑定图片加载事件');
  
  // 为新添加的图片绑定加载事件
  document.querySelectorAll("img.img-loading").forEach(function (img) {
    // 清理可能已存在的事件监听器
    img.onload = null;
    img.onerror = null;
    
    // 重新绑定事件
    function hideSkeleton(evt) {
      let parent = img.parentElement && img.parentElement.parentElement;
      let skeleton = parent
        ? parent.querySelector(".img-skeleton")
        : null;
      img.classList.remove("img-loading");
      img.classList.remove("opacity-0");
      if (img) img.style.opacity = 1;
      if (skeleton) {
        skeleton.remove();
      }
    }
    
    if (img.complete && img.naturalWidth > 0) {
      // 图片已经加载完成
      hideSkeleton();
    } else {
      // 图片还未加载完成，绑定事件监听器
      img.addEventListener("load", hideSkeleton);
      img.addEventListener("error", hideSkeleton);
    }
  });
}

// 检查并绑定Fancybox的通用函数
function checkAndBindFancybox(loadedCount, totalFiles) {
  // 当所有文件都加载完成时，重新绑定 Fancybox 事件
  if (loadedCount === totalFiles) {
    console.log('所有文件加载完成，准备绑定Fancybox事件');
    // 确保在下一个事件循环中绑定 Fancybox
    setTimeout(() => {
      if (typeof Fancybox !== 'undefined') {
        console.log('绑定Fancybox事件');
        try {
          Fancybox.unbind("[data-fancybox]"); // 先解绑之前的事件
          Fancybox.bind("[data-fancybox]", {}); // 重新绑定事件
        } catch (error) {
          console.error('绑定Fancybox事件时出错:', error);
        }
      } else {
        console.warn('Fancybox未定义');
      }
    }, 100); // 延迟100ms确保DOM完全更新
  }
}

// 在 DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM加载完成，开始执行loadYearContent');
  loadYearContent();
});