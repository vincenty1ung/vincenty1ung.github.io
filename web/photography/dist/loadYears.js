// 定义要加载的年份文件(按倒序排列)
const yearFiles = ['2025.html', '2023.html'];

// 动态加载年份内容
function loadYearContent() {
  console.log('开始加载年份内容...');
  const container = document.getElementById('portfolio-years');
  
  // 检查容器元素是否存在
  if (!container) {
    console.error('未找到ID为portfolio-years的容器元素');
    return;
  }
  
  console.log('找到容器元素:', container);
  
  // 创建一个计数器来跟踪加载完成的文件数量
  let loadedCount = 0;
  
  // 检查是否在iframe中运行（可能与浏览器扩展冲突有关）
  if (window.self !== window.top) {
    console.warn('代码在iframe中运行，可能存在浏览器扩展冲突');
  }
  
  // 按倒序加载每个年份文件
  yearFiles.forEach(file => {
    console.log(`开始加载文件: ${file}`);
    
    // 使用XMLHttpRequest作为fetch的备选方案
    if (typeof fetch === 'undefined') {
      console.warn('fetch API不可用，使用XMLHttpRequest');
      const xhr = new XMLHttpRequest();
      xhr.open('GET', file, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            handleFileData(file, xhr.responseText, container, yearFiles.length, () => {
              loadedCount++;
              return loadedCount;
            });
          } else {
            console.error(`加载 ${file} 失败:`, xhr.status, xhr.statusText);
            loadedCount++;
            checkAndBindFancybox(loadedCount, yearFiles.length);
          }
        }
      };
      xhr.onerror = function() {
        console.error(`加载 ${file} 网络错误`);
        loadedCount++;
        checkAndBindFancybox(loadedCount, yearFiles.length);
      };
      try {
        xhr.send();
      } catch (error) {
        console.error(`发送请求 ${file} 失败:`, error);
        loadedCount++;
        checkAndBindFancybox(loadedCount, yearFiles.length);
      }
      return;
    }
    
    // 使用fetch API
    fetch(file)
      .then(response => {
        console.log(`收到 ${file} 的响应:`, response.status, response.statusText);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(data => {
        handleFileData(file, data, container, yearFiles.length, () => {
          loadedCount++;
          return loadedCount;
        });
      })
      .catch(error => {
        console.error(`加载 ${file} 失败:`, error);
        // 即使某个文件加载失败，也要增加计数以确保其他文件的 Fancybox 能正常工作
        loadedCount++;
        checkAndBindFancybox(loadedCount, yearFiles.length);
      });
  });
}

// 处理文件数据的通用函数
function handleFileData(fileName, data, container, totalFiles, incrementCounter) {
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
  
  // 增加加载完成计数
  const newCount = incrementCounter();
  console.log(`加载进度: ${newCount}/${totalFiles}`);
  
  // 在内容添加到DOM后，重新绑定图片加载事件和Fancybox事件
  bindImageLoadEvents();
  checkAndBindFancybox(newCount, totalFiles);
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