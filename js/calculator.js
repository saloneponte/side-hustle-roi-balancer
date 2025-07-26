// 副業損益バランサー計算機能

// UI制御関数
function showCalculator() {
    document.getElementById('calculator').style.display = 'block';
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
}

function hideCalculator() {
    document.getElementById('calculator').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.body.scrollIntoView({ behavior: 'smooth' });
}

function showResults() {
    document.getElementById('results').style.display = 'block';
}

// 税額計算の基本レート（2024年度）
const TAX_RATES = {
    // 所得税率（累進課税）
    incomeTax: [
        { min: 0, max: 1950000, rate: 0.05, deduction: 0 },
        { min: 1950000, max: 3300000, rate: 0.10, deduction: 97500 },
        { min: 3300000, max: 6950000, rate: 0.20, deduction: 427500 },
        { min: 6950000, max: 9000000, rate: 0.23, deduction: 636000 },
        { min: 9000000, max: 18000000, rate: 0.33, deduction: 1536000 },
        { min: 18000000, max: 40000000, rate: 0.40, deduction: 2796000 },
        { min: 40000000, max: Infinity, rate: 0.45, deduction: 4796000 }
    ],
    
    // 住民税率（所得割）
    residentTax: 0.10, // 10%（市民税6% + 県民税4%）
    
    // 社会保険料率（給与所得者）
    socialInsurance: {
        health: 0.0991, // 健康保険料（協会けんぽ東京都）
        pension: 0.183, // 厚生年金保険料
        employment: 0.003, // 雇用保険料（一般事業）
        longTermCare: 0.0127 // 介護保険料（40歳以上）
    }
};

// 控除額
const DEDUCTIONS = {
    basic: 480000, // 基礎控除
    salary: 550000, // 給与所得控除（最低額）
    residentTaxBasic: 430000, // 住民税基礎控除
    socialInsuranceMax: 1740000 // 社会保険料の上限（年収）
};

// 数値フォーマット関数
function formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatPercentage(rate) {
    return (rate * 100).toFixed(1) + '%';
}

// 所得税計算
function calculateIncomeTax(taxableIncome) {
    for (let bracket of TAX_RATES.incomeTax) {
        if (taxableIncome > bracket.min && taxableIncome <= bracket.max) {
            return Math.max(0, taxableIncome * bracket.rate - bracket.deduction);
        }
    }
    return 0;
}

// 住民税計算
function calculateResidentTax(taxableIncome) {
    const taxableAmount = Math.max(0, taxableIncome - DEDUCTIONS.residentTaxBasic);
    return taxableAmount * TAX_RATES.residentTax + 5000; // 均等割5000円
}

// 社会保険料計算（給与所得分のみ）
function calculateSocialInsurance(salary) {
    const rates = TAX_RATES.socialInsurance;
    const insurableIncome = Math.min(salary, DEDUCTIONS.socialInsuranceMax);
    
    return {
        health: insurableIncome * (rates.health / 2), // 労使折半
        pension: insurableIncome * (rates.pension / 2), // 労使折半
        employment: salary * rates.employment,
        longTermCare: salary > 0 ? insurableIncome * (rates.longTermCare / 2) : 0,
        total: function() {
            return this.health + this.pension + this.employment + this.longTermCare;
        }
    };
}

// 給与所得控除計算
function calculateSalaryDeduction(salary) {
    if (salary <= 1625000) return 550000;
    if (salary <= 1800000) return salary * 0.4 - 100000;
    if (salary <= 3600000) return salary * 0.3 + 80000;
    if (salary <= 6600000) return salary * 0.2 + 440000;
    if (salary <= 8500000) return salary * 0.1 + 1100000;
    return 1950000; // 上限
}

// メイン計算関数
function calculateTax(salary, sideIncome, expenses) {
    // 給与所得の計算
    const salaryDeduction = calculateSalaryDeduction(salary);
    const salaryTaxableIncome = Math.max(0, salary - salaryDeduction);
    
    // 副業所得の計算（事業所得として計算）
    const sideTaxableIncome = Math.max(0, sideIncome - expenses);
    
    // 合算所得
    const totalTaxableIncome = salaryTaxableIncome + sideTaxableIncome;
    const adjustedTaxableIncome = Math.max(0, totalTaxableIncome - DEDUCTIONS.basic);
    
    // 税額計算
    const incomeTax = calculateIncomeTax(adjustedTaxableIncome);
    const residentTax = calculateResidentTax(totalTaxableIncome);
    const socialInsurance = calculateSocialInsurance(salary);
    
    // 副業なしの場合の計算
    const salaryOnlyTaxableIncome = Math.max(0, salaryTaxableIncome - DEDUCTIONS.basic);
    const salaryOnlyIncomeTax = calculateIncomeTax(salaryOnlyTaxableIncome);
    const salaryOnlyResidentTax = calculateResidentTax(salaryTaxableIncome);
    
    return {
        totalIncome: salary + sideIncome,
        netIncome: salary + sideIncome - incomeTax - residentTax - socialInsurance.total(),
        incomeTax: incomeTax,
        residentTax: residentTax,
        socialInsurance: socialInsurance.total(),
        totalTax: incomeTax + residentTax + socialInsurance.total(),
        
        // 比較データ
        comparison: {
            salaryOnlyTax: salaryOnlyIncomeTax + salaryOnlyResidentTax + socialInsurance.total(),
            additionalTax: (incomeTax + residentTax) - (salaryOnlyIncomeTax + salaryOnlyResidentTax),
            netIncrease: sideTaxableIncome - ((incomeTax + residentTax) - (salaryOnlyIncomeTax + salaryOnlyResidentTax)),
            roi: sideIncome > 0 ? ((sideTaxableIncome - ((incomeTax + residentTax) - (salaryOnlyIncomeTax + salaryOnlyResidentTax))) / sideIncome) : 0
        }
    };
}

// フォーム送信処理
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('taxForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 入力値の取得
        const salary = parseInt(document.getElementById('salary').value) || 0;
        const sideIncome = parseInt(document.getElementById('sideIncome').value) || 0;
        const expenses = parseInt(document.getElementById('expenses').value) || 0;
        
        // バリデーション
        if (salary < 0 || sideIncome < 0 || expenses < 0) {
            alert('正の数値を入力してください');
            return;
        }
        
        if (expenses > sideIncome) {
            alert('経費は副業収入以下で入力してください');
            return;
        }
        
        // 計算実行
        const result = calculateTax(salary, sideIncome, expenses);
        
        // 結果表示
        document.getElementById('totalIncome').textContent = formatCurrency(result.totalIncome);
        document.getElementById('netIncome').textContent = formatCurrency(result.netIncome);
        document.getElementById('incomeTax').textContent = formatCurrency(result.incomeTax);
        document.getElementById('residentTax').textContent = formatCurrency(result.residentTax);
        document.getElementById('socialInsurance').textContent = formatCurrency(result.socialInsurance);
        document.getElementById('totalTax').textContent = formatCurrency(result.totalTax);
        
        // 比較データ表示
        document.getElementById('additionalTax').textContent = formatCurrency(result.comparison.additionalTax);
        document.getElementById('netIncrease').textContent = formatCurrency(result.comparison.netIncrease);
        document.getElementById('roi').textContent = formatPercentage(result.comparison.roi);
        
        // 結果セクション表示
        showResults();
    });
});

// スムーススクロール
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});