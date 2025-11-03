/**
 *
 * Este arquivo é parte do projeto core-3rdparty community DevSecOps
 *
 * @package core-3rdparty
 * @name luds.groovy
 * @version 1.0.0
 * @description Módulo para a verificação da existência do design system luds
 * @author adler.santos <adler.santos@experian.com> marcosvinicius.ribeiro <marcosvinicius.ribeiro@experian.com>
 * @copyright 2025 © Serasa Experian
 *
 * */

import groovy.json.JsonSlurperClassic
import groovy.json.JsonBuilder
import hudson.model.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import jenkins.model.*

/*
* Variaveis globais
*/

luminaData = [:]

/*
* Métodos
*/

def setMapLuminaUsage() {
    utilsMessageLib.infoMsg(">>> Verificando utilização do Lumina...")

    // 1. Verificar se Lumina está instalado
    def luminaInstalled = checkLuminaInstallation()
    luminaData.lumina_setup = luminaInstalled
    luminaData.analysis_date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"))
    luminaData.gearr_id = getGearrId()

    if (luminaInstalled) {
        utilsMessageLib.infoMsg(">>> Lumina está instalado.")
        // 2. Obter versão
        luminaData.lumina_version = getLuminaVersion()

        // 3. Coletar imports dinamicamente
        def imports = collectLuminaImports()
        luminaData.lumina_usage = imports

        // 4. Calcular métricas
        //luminaData.usage_metrics = calculateUsageMetrics(imports)

        // 5. Converter para JSON
        def jsonBuilder = new JsonBuilder(luminaData)
        def luminaDataJson = jsonBuilder.toPrettyString()
        
        //sendLuminaDataToApi(luminaData)
        utilsMessageLib.infoMsg(">>> Lumina Data JSON: ${luminaDataJson}")
    } else {
        utilsMessageLib.warnMsg(">>> Lumina não está instalado no projeto.")
        luminaData.lumina_setup = false
    }
}

def checkLuminaInstallation() {
    // Verificar se Lumina está instalado
    def result = sh(
        script: 'cat package.json | grep "@luds/ui" > /dev/null',
        returnStatus: true
    )
    return result == 0  // Returns true if grep found the pattern (exit code 0)
}

def getGearrId() {
    // Obter versão do Lumina
    def result = sh(
        script: 'cat piaas.yml | grep "gearr:" | cut -d: -f2 | tr -d " "',
        returnStdout: true
    ).trim()
    return result
}

def getLuminaVersion() {
    // Obter versão do Lumina
    def result = sh(
        script: 'cat package-lock.json | grep -A 1 \'"node_modules/@luds/ui":\' | grep \'"version":\' | grep -oE \'[0-9]+\\.[0-9]+\\.[0-9]+\' | head -1',
        returnStdout: true
    ).trim()
    return result
}

def collectLuminaImports() {
    def imports = [
        blocks: [],
        components: [],
        themes: [],
    ]

    utilsMessageLib.infoMsg(">>> [DEBUG] Iniciando coleta de blocks...")
    
    // Estratégia melhorada: Processa imports multi-linha e de uma linha
    def blocksFound = extractImportsFromFiles("@luds/ui/blocks")

    if (blocksFound && blocksFound.trim()) {
        imports.blocks = blocksFound.split('\n').findAll { it.trim() && it.trim().matches(/^[A-Z].*/) }.collect { it.trim() }
        utilsMessageLib.infoMsg(">>> [DEBUG] Blocks encontrados: ${imports.blocks.size()} itens - ${imports.blocks.join(', ')}")
    } else {
        utilsMessageLib.warnMsg(">>> [DEBUG] Nenhum block encontrado!")
    }

    utilsMessageLib.infoMsg(">>> [DEBUG] Iniciando coleta de components...")
    
    def componentsFound = extractImportsFromFiles("@luds/ui/components")

    if (componentsFound && componentsFound.trim()) {
        imports.components = componentsFound.split('\n').findAll { it.trim() && it.trim().matches(/^[A-Z].*/) }.collect { it.trim() }
        utilsMessageLib.infoMsg(">>> [DEBUG] Components encontrados: ${imports.components.size()} itens - ${imports.components.join(', ')}")
    } else {
        utilsMessageLib.warnMsg(">>> [DEBUG] Nenhum component encontrado!")
    }

    utilsMessageLib.infoMsg(">>> [DEBUG] Iniciando coleta de themes...")
    
    // Coletar temas
    def themesFound = sh(script: '''
        find . -name "*.scss" -o -name "*.sass" -o -name "*.css" 2>/dev/null | while read -r file; do
            [ -f "$file" ] || continue
            grep -oE '@use[[:space:]]*["'"'"']@luds/ui/styles/themes/[^"'"'"']+' "$file" 2>/dev/null | 
            sed 's/.*themes\\///' | 
            sed 's/["'"'"'].*//'
        done | sort | uniq
    ''', returnStdout: true).trim()

    if (themesFound) {
        imports.themes = themesFound.split('\n').findAll { it.trim() }.collect { it.trim() }
        utilsMessageLib.infoMsg(">>> [DEBUG] Themes encontrados: ${imports.themes.size()} itens - ${imports.themes.join(', ')}")
    } else {
        utilsMessageLib.warnMsg(">>> [DEBUG] Nenhum theme encontrado!")
    }

    return imports
}

/**
 * Extrai imports do LUDS de arquivos TypeScript/JavaScript
 * Funciona com imports de uma linha e multi-linha
 * @param basePath Caminho base do import (ex: "@luds/ui/blocks" ou "@luds/ui/components")
 * @return String com lista de componentes encontrados (um por linha)
 */
def extractImportsFromFiles(String basePath) {
    // Escapa caracteres especiais para uso em regex do awk
    // Escapa também para shell
    def escapedPath = basePath.replace('\\', '\\\\')
                               .replace('[', '\\[')
                               .replace(']', '\\]')
                               .replace('.', '\\.')
                               .replace('/', '\\/')
                               .replace('@', '\\@')
                               .replace("'", "'\\''") // Escapa aspas simples para shell
    
    // Variável para $0 do awk (precisa de escape triplo em string tripla)
    def awkDollarZero = '\\$0'
    
    return sh(script: """
        export BASE_PATH="${escapedPath}"
        find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | while read -r file; do
            [ -f "\\$file" ] || continue
            
            # Estratégia melhorada: Normaliza imports multi-linha e extrai componentes
            awk -v base_path="\\$BASE_PATH" '
            BEGIN {
                in_import = 0
                import_buffer = ""
                brace_count = 0
            }
            {
                # Remove comentários de linha (mas preserva estrutura para detectar imports)
                original = ${awkDollarZero}
                gsub(/\\/\\/.*/, "", ${awkDollarZero})
                line = ${awkDollarZero}
                
                # Detecta início de import statement
                if (match(line, /import[[:space:]]+\\{/)) {
                    in_import = 1
                    import_buffer = line
                    # Conta chaves balanceadas
                    brace_count = 0
                    for (i = 1; i <= length(line); i++) {
                        c = substr(line, i, 1)
                        if (c == "{") brace_count++
                        if (c == "}") brace_count--
                    }
                }
                else if (in_import) {
                    # Continua acumulando linhas enquanto o import não termina
                    import_buffer = import_buffer " " line
                    for (i = 1; i <= length(line); i++) {
                        c = substr(line, i, 1)
                        if (c == "{") brace_count++
                        if (c == "}") brace_count--
                    }
                }
                
                # Quando brace_count == 0, o import está completo
                if (in_import && brace_count == 0) {
                    # Verifica se é do caminho desejado
                    pattern = "from[[:space:]]+[\"'"'"']" base_path "[^\"'"'"']+[\"'"'"']"
                    if (match(import_buffer, pattern)) {
                        # Extrai conteúdo entre chaves usando regex
                        if (match(import_buffer, /import[[:space:]]+\\{([^}]+)\\}/, arr)) {
                            content = arr[1]
                            # Normaliza: múltiplos espaços vira um espaço
                            gsub(/[[:space:]]+/, " ", content)
                            gsub(/^[[:space:]]+|[[:space:]]+\$/, "", content)
                            
                            # Divide por vírgulas e processa cada item
                            n = split(content, items, ",")
                            for (i = 1; i <= n; i++) {
                                item = items[i]
                                # Remove espaços do início e fim
                                gsub(/^[[:space:]]+|[[:space:]]+\$/, "", item)
                                # Remove aliases (ex: "Component as Alias" -> "Component")
                                gsub(/[[:space:]]+as[[:space:]]+[A-Za-z0-9_]+\$/, "", item)
                                # Remove espaços extras novamente
                                gsub(/^[[:space:]]+|[[:space:]]+\$/, "", item)
                                # Extrai nome do componente (deve começar com letra maiúscula)
                                if (match(item, /([A-Z][A-Za-z0-9_]*)/, name_arr)) {
                                    print name_arr[1]
                                }
                            }
                        }
                    }
                    # Reset para próximo import
                    in_import = 0
                    import_buffer = ""
                    brace_count = 0
                }
            }
            ' "\\$file" 2>/dev/null
        done | sort | uniq
    """, returnStdout: true).trim()
}

/*
* Métodos de controle de fluxo por stages
*/

/**
* before_build
* Método controla o fluxo de execução para o stage de before_build
**/
def before_build(String cmd) {
    utilsMessageLib.infoMsg("Olá! Esse é um archetype inicial para criação de módulos 3rd Party!")
    utilsMessageLib.infoMsg("Os argumentos recebidos foram: ${cmd}")

    setMapLuminaUsage()

    utilsMessageLib.infoMsg("Esse módulo base foi executado conforme esperado!")
}

return this
